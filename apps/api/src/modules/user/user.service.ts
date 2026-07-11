import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
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

  constructor(private prisma: PrismaService) {
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
        createdAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Kullanıcı bulunamadı veya pasif durumda.');
    }

    // Merge default notification settings if empty
    const settings = user.notificationSettings
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...(user.notificationSettings as any) }
      : DEFAULT_NOTIFICATION_SETTINGS;

    return {
      ...user,
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

    return {
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
      email: user.email,
    };
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
