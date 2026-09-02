import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UpdateProfileDto, UpdatePasswordDto, UpdateNotificationsDto, CancelAccountDto } from './user.dto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ListingStatus } from '@prisma/client';
const sharp = require('sharp');

export const DEFAULT_NOTIFICATION_SETTINGS = {
  emailMessages: true,
  emailListingUpdates: true,
  emailSavedSearchAlerts: true,
  emailSubscriptionUpdates: true,
  pushMessages: true,
  pushListingUpdates: true,
  pushSavedSearchAlerts: true,
};

const RESERVED_USERNAMES = new Set([
  'admin',
  'support',
  'torquescout',
  'null',
  'undefined',
  'system',
  'moderator',
  'root',
  'help',
  'api'
]);

@Injectable()
export class UserService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    this.s3Client = new S3Client({
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      region: 'auto',
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        profilePhotoUrl: true,
        displayNamePreference: true,
        notificationSettings: true,
        subscriptionTier: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Kullanıcı bulunamadı veya pasif durumda.');
    }

    const effectiveTier = await this.subscriptionService.getEffectiveTier(userId);

    // Merge default notification settings if empty
    const settings = user.notificationSettings
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...(user.notificationSettings as any) }
      : DEFAULT_NOTIFICATION_SETTINGS;

    const ADMIN_EMAILS = [
      'efeguven9991@gmail.com',
      'm.efeeguven@gmail.com',
      'burhanseckin08@gmail.com',
      'burhanseckin08@icloud.com',
    ];

    const effectiveRole =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
        ? 'ADMIN'
        : user.role;

    return {
      ...user,
      role: effectiveRole as any,
      subscriptionTier: effectiveTier,
      notificationSettings: settings,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const dataToUpdate: any = {};

    if (dto.username !== undefined) {
      const username = dto.username.trim().toLowerCase();
      if (RESERVED_USERNAMES.has(username)) {
        throw new BadRequestException('Bu kullanıcı adı sistem tarafından ayrılmıştır, kullanılamaz.');
      }

      // Check uniqueness
      const existing = await this.prisma.user.findFirst({
        where: {
          username,
          id: { not: userId },
        },
      });
      if (existing) {
        throw new ConflictException('Bu kullanıcı adı başka bir üye tarafından kullanılmaktadır.');
      }
      dataToUpdate.username = username;
    }

    if (dto.firstName !== undefined) dataToUpdate.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) dataToUpdate.lastName = dto.lastName.trim();
    if (dto.displayNamePreference !== undefined) dataToUpdate.displayNamePreference = dto.displayNamePreference;

    if (dto.phone !== undefined) {
      const phone = dto.phone.trim();
      if (phone) {
        const existingPhone = await this.prisma.user.findFirst({
          where: {
            phone,
            id: { not: userId },
          },
        });
        if (existingPhone) {
          throw new ConflictException('Bu telefon numarası başka bir üye tarafından kullanılmaktadır.');
        }
        dataToUpdate.phone = phone;
        // If phone changed, reset verification
        if (user.phone !== phone) {
          dataToUpdate.phoneVerifiedAt = null;
        }
      } else {
        dataToUpdate.phone = null;
        dataToUpdate.phoneVerifiedAt = null;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return this.getMe(updatedUser.id);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const isMatch = user.passwordHash === dto.currentPassword;
    if (!isMatch) {
      throw new BadRequestException('Mevcut şifreniz yanlış.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: dto.newPassword },
    });

    return { message: 'Şifreniz başarıyla güncellendi.' };
  }

  async updateNotifications(userId: string, dto: UpdateNotificationsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const currentSettings = user.notificationSettings
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...(user.notificationSettings as any) }
      : DEFAULT_NOTIFICATION_SETTINGS;

    const newSettings = {
      ...currentSettings,
      ...dto,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationSettings: newSettings },
    });

    return newSettings;
  }

  async uploadProfilePhoto(userId: string, buffer: Buffer, mimeType: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Validate image format
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('Sadece JPEG, PNG ve WebP formatında görsel yükleyebilirsiniz.');
    }

    // Validate size
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Profil fotoğrafı maksimum 2MB boyutunda olmalıdır.');
    }

    // Validate dimensions
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height || metadata.width < 200 || metadata.height < 200) {
        throw new BadRequestException('Profil fotoğrafı minimum 200x200 piksel boyutunda olmalıdır.');
      }
    } catch (e) {
      throw new BadRequestException('Geçersiz görsel dosyası.');
    }

    // Delete old profile photo if exists
    if (user.profilePhotoUrl) {
      await this.deleteImageFromR2(user.profilePhotoUrl);
    }

    // Optimize and convert to WebP using sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    const uniqueId = `${userId}-${Date.now()}`;
    const storageKey = `profile-photos/${uniqueId}.webp`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
        Body: optimizedBuffer,
        ContentType: 'image/webp',
      }),
    );

    const publicUrl = `${this.publicUrl}/${storageKey}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: publicUrl },
    });

    return { profilePhotoUrl: publicUrl };
  }

  async deleteProfilePhoto(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    if (user.profilePhotoUrl) {
      await this.deleteImageFromR2(user.profilePhotoUrl);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: null },
    });

    return { message: 'Profil fotoğrafı kaldırıldı.' };
  }

  async cancelAccount(userId: string, dto: CancelAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const isMatch = user.passwordHash === dto.password;
    if (!isMatch) {
      throw new ForbiddenException('Hesap iptali için girdiğiniz şifre hatalı.');
    }

    // Soft deactivate user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        firstName: null,
        lastName: null,
        phone: null,
        phoneVerifiedAt: null,
        profilePhotoUrl: null,
        // Mask email for KVKK compliance
        email: `deleted-${userId}@torquescout-anonymous.com`,
      },
    });

    // Unpublish active listings
    await this.prisma.vehicleListing.updateMany({
      where: { sellerId: userId },
      data: { status: ListingStatus.PASSIVE },
    });

    // Clean up photo from R2 if user had one
    if (user.profilePhotoUrl) {
      await this.deleteImageFromR2(user.profilePhotoUrl);
    }

    return { message: 'Hesabınız başarıyla iptal edildi ve tüm ilanlarınız yayından kaldırıldı.' };
  }
  async forgotPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
      email: user.email,
    };
  }

  async generateCustomerNo(createdAtDate: Date = new Date()): Promise<string> {
    const yy = String(createdAtDate.getFullYear()).slice(-2);
    const mm = String(createdAtDate.getMonth() + 1).padStart(2, '0');
    const period = `${yy}${mm}`;

    const updatedCounter = await this.prisma.customerNoCounter.upsert({
      where: { period },
      update: { counter: { increment: 1 } },
      create: { period, counter: 1 },
    });

    const seqStr = String(updatedCounter.counter).padStart(6, '0');
    return `TS-${period}-${seqStr}`;
  }

  async ensureCustomerNo(user: any): Promise<string> {
    if (user.customerNo) return user.customerNo;
    const generated = await this.generateCustomerNo(user.createdAt || new Date());
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { customerNo: generated },
      });
      return generated;
    } catch (e) {
      return generated;
    }
  }

  async getAdminUserList(params: {
    search?: string;
    subscriptionTier?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 15;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.subscriptionTier) {
      where.subscriptionTier = params.subscriptionTier;
    }

    if (params.isActive !== undefined && params.isActive !== '') {
      where.isActive = params.isActive === 'true';
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { customerNo: { contains: s, mode: 'insensitive' } },
        { id: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              listings: true,
              chatLogs: true,
              generatedVehicleReports: true,
            },
          },
        },
      }),
    ]);

    const formatted = await Promise.all(
      users.map(async (u) => {
        const customerNo = await this.ensureCustomerNo(u);
        return {
          id: u.id,
          customerNo,
          email: u.email,
          firstName: u.firstName || '-',
          lastName: u.lastName || '-',
          fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0],
          phone: u.phone || '-',
          role: u.role,
          permissions: u.permissions || [],
          subscriptionTier: u.subscriptionTier,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          activeListingCount: u._count.listings,
          aiReportCount: u._count.generatedVehicleReports + u._count.chatLogs,
        };
      })
    );

    return {
      users: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --- ADMIN BACKOFFICE METHODS ---

  async getAdminUsers(params: {
    search?: string;
    subscriptionTier?: string;
    isActive?: boolean;
    hasListings?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { customerNo: { contains: s, mode: 'insensitive' } },
        { id: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (params.subscriptionTier) {
      where.subscriptionTier = params.subscriptionTier;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.hasListings) {
      where.listings = { some: {} };
    }

    // Fetch matching users with relation counts for global dataset sorting
    const users = await this.prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            listings: true,
            chatLogs: true,
            generatedVehicleReports: true,
            subscriptions: true,
          },
        },
      },
    });

    const getPackageDisplayName = (tier: string | undefined | null): string => {
      if (!tier) return 'Tanışma Paketi';
      const t = String(tier).toUpperCase();
      if (t === 'YETKIN' || t === 'STANDARD') return 'Yetkin Paket';
      if (t === 'PROFESYONEL' || t === 'PRO' || t === 'PREMIUM') return 'Profesyonel Paket';
      return 'Tanışma Paketi';
    };

    const getPackageRank = (tier: string | undefined | null): number => {
      if (!tier) return 1;
      const t = String(tier).toUpperCase();
      if (t === 'YETKIN' || t === 'STANDARD') return 2;
      if (t === 'PROFESYONEL' || t === 'PRO' || t === 'PREMIUM') return 3;
      return 1;
    };

    let formatted = users.map((u) => {
      const yearMonth = u.createdAt ? `${new Date(u.createdAt).getFullYear().toString().slice(-2)}${(new Date(u.createdAt).getMonth() + 1).toString().padStart(2, '0')}` : '2607';
      const customerNo = u.customerNo || `TS-${yearMonth}-000001`;
      return {
        id: u.id,
        customerNo,
        email: u.email,
        firstName: u.firstName || '-',
        lastName: u.lastName || '-',
        fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0],
        phone: u.phone || '-',
        role: u.role,
        subscriptionTier: getPackageDisplayName(u.subscriptionTier),
        packageRank: getPackageRank(u.subscriptionTier),
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        activeListingCount: u._count.listings,
        aiReportCount: u._count.generatedVehicleReports + u._count.chatLogs,
      };
    });

    // Server-side single-column sorting across entire dataset
    const sortBy = params.sortBy || 'createdAt';
    const sortDir = params.sortDirection === 'asc' ? 'asc' : 'desc';

    formatted.sort((a, b) => {
      let res = 0;
      if (sortBy === 'customer' || sortBy === 'createdAt') {
        res = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'name') {
        res = a.fullName.localeCompare(b.fullName, 'tr', { sensitivity: 'base' });
      } else if (sortBy === 'package' || sortBy === 'subscriptionTier') {
        res = a.packageRank - b.packageRank;
      } else if (sortBy === 'listingCount' || sortBy === 'listings') {
        res = a.activeListingCount - b.activeListingCount;
      } else if (sortBy === 'aiUsage') {
        res = a.aiReportCount - b.aiReportCount;
      } else if (sortBy === 'accountStatus' || sortBy === 'isActive') {
        res = a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1;
      } else {
        res = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? res : -res;
    });

    const total = formatted.length;
    const paginated = formatted.slice(skip, skip + limit);

    return {
      users: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAdminUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        buyerPurchases: {
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        listings: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            vehicleVariant: {
              include: {
                model: { include: { brand: true } },
                trim: true,
              },
            },
            media: {
              select: { id: true, url: true, sortOrder: true },
            },
          },
        },
        adminNotes: {
          orderBy: { createdAt: 'desc' },
        },
        adminMessages: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            chatLogs: true,
            generatedVehicleReports: true,
            comparisons: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Fetch audit logs for this user
    let auditLogs: any[] = [];
    try {
      auditLogs = await this.prisma.adminAuditLog.findMany({
        where: {
          OR: [
            { entityId: userId },
            { entityType: 'UserSubscription', entityId: userId },
            { entityType: 'BuyerPackagePurchase', entityId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (e) {}

    // Aggregate real history timeline
    const history: any[] = [];

    // 1. Account registration
    if (user.createdAt) {
      history.push({
        id: `reg-${user.id}`,
        type: 'USER_REGISTERED',
        title: 'Hesap Oluşturuldu',
        description: `Kullanıcı TorqueScout platformuna kayıt oldu (${user.email}).`,
        date: user.createdAt,
        badgeColor: 'emerald',
      });
    }

    // 2. Listing events
    (user.listings || []).forEach((l) => {
      history.push({
        id: `listing-${l.id}`,
        type: 'LISTING_CREATED',
        title: `İlan Yayınlandı/Gönderildi (${l.status})`,
        description: `${l.title || 'Araç İlanı'} - ₺${Number(l.priceAmount || 0).toLocaleString('tr-TR')}`,
        date: l.createdAt,
        badgeColor: l.status === 'ACTIVE' ? 'emerald' : l.status === 'REJECTED' ? 'rose' : 'amber',
      });
    });

    // 3. Subscriptions & Grants
    (user.subscriptions || []).forEach((s: any) => {
      history.push({
        id: `sub-${s.id}`,
        type: 'SUBSCRIPTION_GRANTED',
        title: `Abonelik Paketi Tanımlandı (${s.plan?.name || s.tier || 'Standart'})`,
        description: `Kaynak: ${s.source || 'ADMIN_GRANT'}`,
        date: s.createdAt,
        badgeColor: 'orange',
      });
    });

    // 4. Buyer purchases
    (user.buyerPurchases || []).forEach((p: any) => {
      history.push({
        id: `buyer-${p.id}`,
        type: 'BUYER_PACKAGE_GRANTED',
        title: `Alıcı Ek Hak Paketi Tanımlandı (${p.packageCode})`,
        description: `+${p.aiReportLimit} AI Rapor / +${p.chatbotMessageLimit} Chatbot Hakkı`,
        date: p.createdAt,
        badgeColor: 'cyan',
      });
    });

    // 5. Admin messages
    (user.adminMessages || []).forEach((m: any) => {
      history.push({
        id: `msg-${m.id}`,
        type: 'ADMIN_MESSAGE',
        title: `Yönetici Mesajı: ${m.subject}`,
        description: m.message,
        date: m.createdAt,
        badgeColor: 'indigo',
      });
    });

    // 6. Admin notes
    (user.adminNotes || []).forEach((n: any) => {
      history.push({
        id: `note-${n.id}`,
        type: 'ADMIN_NOTE',
        title: 'Yönetici Notu Eklendi',
        description: n.content,
        date: n.createdAt,
        badgeColor: 'slate',
      });
    });

    // Sort timeline descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      user: {
        id: user.id,
        customerNo: user.customerNo || `TS-${user.id.slice(0, 8).toUpperCase()}`,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0],
        phone: user.phone,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profilePhotoUrl: user.profilePhotoUrl,
      },
      subscriptions: user.subscriptions,
      packagePurchases: user.buyerPurchases,
      listings: user.listings,
      adminNotes: user.adminNotes,
      adminMessages: user.adminMessages,
      auditLogs,
      history,
      usageStats: {
        aiReports: user._count.generatedVehicleReports,
        chatbotQueries: user._count.chatLogs,
        comparisons: user._count.comparisons,
        favorites: user._count.favorites,
      },
    };
  }

  async sendAdminUserMessage(
    userId: string,
    adminUserId: string,
    adminEmail: string | undefined,
    dto: { subject: string; message: string; sendInApp?: boolean; sendEmail?: boolean }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const adminMessage = await this.prisma.adminUserMessage.create({
      data: {
        userId,
        createdByAdminId: adminUserId,
        adminEmail: adminEmail || 'Admin',
        subject: dto.subject,
        message: dto.message,
        sendInApp: dto.sendInApp ?? true,
        sendEmail: dto.sendEmail ?? false,
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        entityType: 'User',
        entityId: userId,
        adminUserId,
        adminEmail,
        action: 'USER_MESSAGE_SENT',
        after: adminMessage as any,
      },
    });

    return adminMessage;
  }

  async getAdminUserMessagesAll(params: {
    search?: string;
    sendInApp?: string;
    sendEmail?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.sendInApp !== undefined && params.sendInApp !== '') {
      where.sendInApp = params.sendInApp === 'true';
    }
    if (params.sendEmail !== undefined && params.sendEmail !== '') {
      where.sendEmail = params.sendEmail === 'true';
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { subject: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } },
        { adminEmail: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { customerNo: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, messages] = await Promise.all([
      this.prisma.adminUserMessage.count({ where }),
      this.prisma.adminUserMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              customerNo: true,
            },
          },
        },
      }),
    ]);

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createAdminUserNote(
    userId: string,
    adminUserId: string,
    adminEmail: string | undefined,
    content: string
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const note = await this.prisma.adminUserNote.create({
      data: {
        userId,
        createdByAdminId: adminUserId,
        adminEmail: adminEmail || 'Admin',
        content,
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        entityType: 'User',
        entityId: userId,
        adminUserId,
        adminEmail,
        action: 'USER_NOTE_CREATED',
        after: note as any,
      },
    });

    return note;
  }

  async updateUserPermissions(
    targetUserId: string,
    permissions: string[],
    adminUserId: string,
    adminEmail?: string
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { permissions },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        entityType: 'User',
        entityId: targetUserId,
        adminUserId,
        adminEmail: adminEmail || 'SuperAdmin',
        action: 'USER_PERMISSIONS_UPDATED',
        before: { permissions: user.permissions } as any,
        after: { permissions: updated.permissions } as any,
      },
    });

    return updated;
  }

  private async deleteImageFromR2(url: string) {
    try {
      const parts = url.split('.r2.dev/');
      const key = parts[1];
      if (key) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
        );
      }
    } catch (e) {
      console.error('Failed to delete image from R2:', e.message);
    }
  }
}

