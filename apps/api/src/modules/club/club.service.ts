import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { R2Service } from '../listing/r2.service';
import {
  CreateClubPostDto,
  UpdateClubPostDto,
  CreateClubCommentDto,
  UpdateClubCommentDto,
  MuteUserDto,
  BanUserDto,
  AdminDirectMessageDto,
} from './club.dto';
import {
  ClubPostStatus,
  ClubCommentStatus,
  ClubRestrictionType,
  Role,
  SubscriptionTier,
  ConversationContextType,
} from '@prisma/client';

export function formatCustomerNo(user: { id: string; customerNo?: string | null; createdAt?: Date | string }): string {
  if (user?.customerNo) return user.customerNo;
  const date = user?.createdAt ? new Date(user.createdAt) : new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const cleanId = (user?.id || '00000000').replace(/-/g, '');
  const numPart = String((parseInt(cleanId.slice(0, 8), 16) % 900000) + 100000);
  return `TS-${yy}${mm}-${numPart}`;
}

export function formatUserDisplayName(user: {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string;
  customerNo?: string | null;
  createdAt?: Date | string;
}): string {
  if (!user) return 'Bilinmeyen Kullanıcı';
  const customerNo = formatCustomerNo(user);
  const fullName =
    user.name ||
    (user.firstName || user.lastName
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user.username || 'Kullanıcı');
  return `${customerNo} — ${fullName}`;
}

export interface UserPackageBadge {
  code: string;
  label: string;
}

@Injectable()
export class ClubService {
  private readonly logger = new Logger(ClubService.name);
  private clubSettings = {
    rulesText: 'Tork Scout Club Topluluk Kuralları...',
    supportUrl: 'https://torkscout.com/support',
    commentCharLimit: 1000,
    commentRateLimitSeconds: 10,
    dailyCommentLimit: 50,
    maxImagesPerPost: 10,
  };

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  // ==========================================
  // PACKAGE & ROLE HELPERS
  // ==========================================

  resolveUserPackageBadge(user: { subscriptionTier?: SubscriptionTier }): UserPackageBadge {
    const tier = user?.subscriptionTier || SubscriptionTier.FREE;

    switch (tier) {
      case SubscriptionTier.YETKIN:
      case SubscriptionTier.STANDARD:
      case SubscriptionTier.PRO:
        return { code: 'YETKIN', label: 'Yetkin' };

      case SubscriptionTier.PROFESYONEL:
      case SubscriptionTier.PREMIUM:
        return { code: 'PROFESYONEL', label: 'Profesyonel' };

      case SubscriptionTier.TANISMA:
      case SubscriptionTier.FREE:
      default:
        return { code: 'TANISMA', label: 'Tanışma' };
    }
  }

  async getUserClubRole(userId: string): Promise<'ADMIN' | 'MODERATOR' | 'MEMBER'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return 'MEMBER';
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) return 'ADMIN';

    const activeMod = await this.prisma.clubModeratorAssignment.findFirst({
      where: { userId, revokedAt: null },
    });

    if (activeMod) return 'MODERATOR';

    return 'MEMBER';
  }

  async checkUserRestriction(userId: string): Promise<{ isBanned: boolean; isMuted: boolean; activeRestriction?: any }> {
    const now = new Date();

    const activeRestrictions = await this.prisma.clubRestriction.findMany({
      where: {
        userId,
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const ban = activeRestrictions.find(r => r.type === ClubRestrictionType.BAN);
    if (ban) {
      return { isBanned: true, isMuted: true, activeRestriction: ban };
    }

    const mute = activeRestrictions.find(r => r.type === ClubRestrictionType.MUTE);
    if (mute) {
      return { isBanned: false, isMuted: true, activeRestriction: mute };
    }

    return { isBanned: false, isMuted: false };
  }

  // ==========================================
  // PUBLIC MEMBER ENDPOINTS
  // ==========================================

  async getPublishedPosts(userId?: string, cursor?: string, limit: number = 10) {
    if (userId) {
      const { isBanned } = await this.checkUserRestriction(userId);
      if (isBanned) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'CLUB_BANNED',
          message: 'Tork Scout Club erişiminiz sınırlandırılmıştır.',
        });
      }
    }

    const posts = await this.prisma.clubPost.findMany({
      where: {
        status: ClubPostStatus.PUBLISHED,
        deletedAt: null,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [
        { isPinned: 'desc' },
        { pinnedOrder: 'asc' },
        { publishedAt: 'desc' },
      ],
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, username: true, profilePhotoUrl: true, role: true },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { comments: { where: { status: ClubCommentStatus.VISIBLE, deletedAt: null } }, likes: true },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem?.id;
    }

    // Determine liked status if userId provided
    let likedPostIds = new Set<string>();
    if (userId && posts.length > 0) {
      const likes = await this.prisma.clubPostLike.findMany({
        where: {
          userId,
          postId: { in: posts.map(p => p.id) },
        },
        select: { postId: true },
      });
      likedPostIds = new Set(likes.map(l => l.postId));
    }

    const formattedPosts = posts.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      commentCount: p._count.comments,
      likeCount: p._count.likes,
    }));

    return { posts: formattedPosts, nextCursor };
  }

  async getPostDetail(postId: string, userId?: string) {
    const post = await this.prisma.clubPost.findFirst({
      where: { id: postId, status: ClubPostStatus.PUBLISHED, deletedAt: null },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, username: true, profilePhotoUrl: true, role: true },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        _count: {
          select: { comments: { where: { status: ClubCommentStatus.VISIBLE, deletedAt: null } }, likes: true },
        },
      },
    });

    if (!post) throw new NotFoundException('Gönderi bulunamadı veya arşivlenmiş.');

    let isLiked = false;
    if (userId) {
      const like = await this.prisma.clubPostLike.findUnique({
        where: { postId_userId: { postId, userId } },
      });
      isLiked = !!like;
    }

    return { ...post, isLiked, commentCount: post._count.comments, likeCount: post._count.likes };
  }

  async getComments(postId: string, cursor?: string, limit: number = 30) {
    const comments = await this.prisma.clubComment.findMany({
      where: {
        postId,
        status: ClubCommentStatus.VISIBLE,
        deletedAt: null,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhotoUrl: true,
            role: true,
            subscriptionTier: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id;
    }

    // Attach package badges and role tags to each author
    const formattedComments = await Promise.all(
      comments.map(async c => {
        const clubRole = await this.getUserClubRole(c.author.id);
        const pkgBadge = this.resolveUserPackageBadge(c.author);

        return {
          id: c.id,
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt,
          editedAt: c.editedAt,
          author: {
            id: c.author.id,
            displayName: c.author.username || `${c.author.firstName || ''} ${c.author.lastName || ''}`.trim() || 'Üye',
            profilePhotoUrl: c.author.profilePhotoUrl,
            packageBadge: pkgBadge,
            clubRole,
          },
        };
      })
    );

    return { comments: formattedComments, nextCursor };
  }

  async addComment(postId: string, authorId: string, content: string) {
    const { isBanned, isMuted, activeRestriction } = await this.checkUserRestriction(authorId);
    if (isBanned || isMuted) {
      throw new ForbiddenException(
        activeRestriction?.reason
          ? `Yorum yapma yetkiniz kısıtlanmıştır: ${activeRestriction.reason}`
          : 'Yorum yapma yetkiniz kısıtlanmıştır.'
      );
    }

    const post = await this.prisma.clubPost.findFirst({
      where: { id: postId, status: ClubPostStatus.PUBLISHED, deletedAt: null },
    });

    if (!post) throw new NotFoundException('Gönderi bulunamadı.');
    if (!post.commentsEnabled) throw new BadRequestException('Bu gönderi için yorumlar kapatılmıştır.');

    // Rate Limit Check: 1 comment per 10s per user
    const lastComment = await this.prisma.clubComment.findFirst({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastComment && Date.now() - new Date(lastComment.createdAt).getTime() < 10000) {
      throw new BadRequestException('Çok hızlı yorum yapıyorsunuz. Lütfen 10 saniye bekleyin.');
    }

    // XSS Sanitization (Plain text escape)
    const sanitizedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();

    if (!sanitizedContent) throw new BadRequestException('Yorum içeriği boş olamaz.');

    return this.prisma.clubComment.create({
      data: {
        postId,
        authorId,
        content: sanitizedContent,
        status: ClubCommentStatus.VISIBLE,
      },
    });
  }

  async editComment(commentId: string, userId: string, newContent: string) {
    const comment = await this.prisma.clubComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) throw new NotFoundException('Yorum bulunamadı.');
    if (comment.authorId !== userId) throw new ForbiddenException('Bu yorumu düzenleme yetkiniz yok.');

    // 15-Minute Edit Window Rule
    const fifteenMinsMs = 15 * 60 * 1000;
    if (Date.now() - new Date(comment.createdAt).getTime() > fifteenMinsMs) {
      throw new BadRequestException('Yorumlar yalnızca yayınlandıktan sonraki ilk 15 dakika içinde düzenlenebilir.');
    }

    const sanitized = newContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();

    return this.prisma.clubComment.update({
      where: { id: commentId },
      data: {
        content: sanitized,
        editedAt: new Date(),
      },
    });
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.clubComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) throw new NotFoundException('Yorum bulunamadı.');

    const isAuthor = comment.authorId === userId;
    const isMod = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || (await this.getUserClubRole(userId)) === 'MODERATOR';

    if (!isAuthor && !isMod) {
      throw new ForbiddenException('Bu yorumu silme yetkiniz yok.');
    }

    return this.prisma.clubComment.update({
      where: { id: commentId },
      data: {
        status: ClubCommentStatus.DELETED,
        deletedAt: new Date(),
      },
    });
  }

  async togglePostLike(postId: string, userId: string) {
    const existing = await this.prisma.clubPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.clubPostLike.delete({
        where: { postId_userId: { postId, userId } },
      });
      return { isLiked: false };
    } else {
      await this.prisma.clubPostLike.create({
        data: { postId, userId },
      });
      return { isLiked: true };
    }
  }

  async getPinnedPosts() {
    return this.prisma.clubPost.findMany({
      where: { status: ClubPostStatus.PUBLISHED, isPinned: true, deletedAt: null },
      take: 3,
      orderBy: [{ pinnedOrder: 'asc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        media: { take: 1, select: { mediaUrl: true } },
      },
    });
  }

  // ==========================================
  // ADMIN & MODERATOR ENDPOINTS
  // ==========================================

  async uploadPostMedia(file: any, userId: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Lütfen geçerli bir görsel dosyası seçin.');
    }

    try {
      const uploadResult = await this.r2Service.uploadImage(file.buffer, 'club');
      return { url: uploadResult.url };
    } catch (err) {
      this.logger.warn('R2 Service upload failed or unconfigured, returning optimized data URL fallback', err);
      try {
        const sharp = require('sharp');
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true, fit: 'inside' })
          .webp({ quality: 75 })
          .toBuffer();
        const base64 = optimizedBuffer.toString('base64');
        return { url: `data:image/webp;base64,${base64}` };
      } catch (sharpErr) {
        const mime = file.mimetype || 'image/jpeg';
        const base64 = file.buffer.toString('base64');
        return { url: `data:${mime};base64,${base64}` };
      }
    }
  }

  async createPost(adminId: string, dto: CreateClubPostDto) {
    try {
      const post = await this.prisma.clubPost.create({
        data: {
          authorId: adminId,
          title: dto.title || null,
          content: dto.content,
          status: ClubPostStatus.PUBLISHED,
          commentsEnabled: dto.commentsEnabled ?? true,
          isPinned: dto.isPinned ?? false,
          pinnedOrder: dto.pinnedOrder ?? null,
          publishedAt: new Date(),
        },
      });

      if (dto.mediaUrls && dto.mediaUrls.length > 0) {
        await this.prisma.clubPostMedia.createMany({
          data: dto.mediaUrls.map((url, idx) => ({
            postId: post.id,
            mediaUrl: url,
            sortOrder: idx,
            uploadedById: adminId,
            status: 'ATTACHED' as any,
          })),
        });
      }

      return await this.getPostDetail(post.id, adminId);
    } catch (error: any) {
      this.logger.error('Error creating Club post:', error);
      throw new BadRequestException(
        error?.message || 'Gönderi kaydedilirken hata oluştu. Lütfen veritabanı bağlantınızı ve parametreleri kontrol edin.'
      );
    }
  }

  async updatePost(postId: string, dto: UpdateClubPostDto) {
    const post = await this.prisma.clubPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Gönderi bulunamadı.');

    return this.prisma.clubPost.update({
      where: { id: postId },
      data: {
        title: dto.title,
        content: dto.content,
        commentsEnabled: dto.commentsEnabled,
        isPinned: dto.isPinned,
        pinnedOrder: dto.pinnedOrder,
      },
    });
  }

  async publishPost(postId: string) {
    return this.prisma.clubPost.update({
      where: { id: postId },
      data: { status: ClubPostStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async archivePost(postId: string) {
    return this.prisma.clubPost.update({
      where: { id: postId },
      data: { status: ClubPostStatus.ARCHIVED },
    });
  }

  async togglePostComments(postId: string) {
    const post = await this.prisma.clubPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Gönderi bulunamadı.');

    return this.prisma.clubPost.update({
      where: { id: postId },
      data: { commentsEnabled: !post.commentsEnabled },
    });
  }

  async hideComment(commentId: string, actorId: string, actorRole: string, reason?: string) {
    const comment = await this.prisma.clubComment.update({
      where: { id: commentId },
      data: { status: ClubCommentStatus.HIDDEN },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId,
        actorRole,
        actionType: 'HIDE_COMMENT',
        targetUserId: comment.authorId,
        commentId,
        reason,
      },
    });

    return comment;
  }

  async reviewComment(commentId: string, actorId: string, actorRole: string) {
    return this.prisma.clubComment.update({
      where: { id: commentId },
      data: { status: ClubCommentStatus.PENDING_REVIEW },
    });
  }

  async restoreComment(commentId: string, actorId: string, actorRole: string) {
    return this.prisma.clubComment.update({
      where: { id: commentId },
      data: { status: ClubCommentStatus.VISIBLE },
    });
  }

  async muteUser(userId: string, actorId: string, actorRole: string, dto: MuteUserDto) {
    const durationDays = dto.durationDays || 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Revoke previous active mutes
    await this.prisma.clubRestriction.updateMany({
      where: { userId, type: ClubRestrictionType.MUTE, revokedAt: null },
      data: { revokedAt: new Date(), revokedById: actorId },
    });

    const restriction = await this.prisma.clubRestriction.create({
      data: {
        userId,
        type: ClubRestrictionType.MUTE,
        reason: dto.reason,
        startsAt: new Date(),
        expiresAt,
        createdById: actorId,
      },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId,
        actorRole,
        actionType: 'MUTE_USER',
        targetUserId: userId,
        reason: dto.reason,
        metadata: { durationDays, expiresAt },
      },
    });

    return restriction;
  }

  async banUser(userId: string, adminId: string, reason: string) {
    // Revoke all mutes
    await this.prisma.clubRestriction.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedById: adminId },
    });

    const ban = await this.prisma.clubRestriction.create({
      data: {
        userId,
        type: ClubRestrictionType.BAN,
        reason,
        startsAt: new Date(),
        createdById: adminId,
      },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId: adminId,
        actorRole: 'ADMIN',
        actionType: 'BAN_USER',
        targetUserId: userId,
        reason,
      },
    });

    return ban;
  }

  async unbanUser(userId: string, adminId: string) {
    return this.prisma.clubRestriction.updateMany({
      where: { userId, type: ClubRestrictionType.BAN, revokedAt: null },
      data: { revokedAt: new Date(), revokedById: adminId },
    });
  }

  async assignModerator(userId: string, adminId: string) {
    const active = await this.prisma.clubModeratorAssignment.findFirst({
      where: { userId, revokedAt: null },
    });

    if (active) throw new ConflictException('Bu kullanıcı zaten aktif moderatördür.');

    return this.prisma.clubModeratorAssignment.create({
      data: {
        userId,
        assignedByAdminId: adminId,
      },
    });
  }

  async revokeModerator(userId: string, adminId: string) {
    return this.prisma.clubModeratorAssignment.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedByAdminId: adminId },
    });
  }

  async sendAdminDirectMessage(targetUserId: string, adminId: string, dto: AdminDirectMessageDto) {
    // Find or create active CLUB_ADMIN conversation
    let conv = await this.prisma.conversation.findFirst({
      where: {
        contextType: ConversationContextType.CLUB_ADMIN,
        buyerId: targetUserId,
        sellerId: adminId,
      },
    });

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          contextType: ConversationContextType.CLUB_ADMIN,
          buyerId: targetUserId,
          sellerId: adminId,
        },
      });
    }

    const msg = await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: adminId,
        body: dto.message,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    return msg;
  }

  async getAdminDashboardData() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      archivedPosts,
      totalComments,
      todayCommentsCount,
      pendingCommentsCount,
      activeModeratorsCount,
      activeMutesCount,
      activeBansCount,
      recentPosts,
      pendingComments,
      activeRestrictions,
      recentActivity,
      recent7DaysComments,
      prev7DaysComments,
    ] = await Promise.all([
      this.prisma.clubPost.count({ where: { deletedAt: null } }),
      this.prisma.clubPost.count({ where: { status: ClubPostStatus.PUBLISHED, deletedAt: null } }),
      this.prisma.clubPost.count({ where: { status: ClubPostStatus.DRAFT, deletedAt: null } }),
      this.prisma.clubPost.count({ where: { status: ClubPostStatus.ARCHIVED, deletedAt: null } }),
      this.prisma.clubComment.count({ where: { deletedAt: null } }),
      this.prisma.clubComment.count({ where: { createdAt: { gte: startOfToday }, deletedAt: null } }),
      this.prisma.clubComment.count({ where: { status: ClubCommentStatus.PENDING_REVIEW, deletedAt: null } }),
      this.prisma.clubModeratorAssignment.count({ where: { revokedAt: null } }),
      this.prisma.clubRestriction.count({ where: { type: ClubRestrictionType.MUTE, revokedAt: null } }),
      this.prisma.clubRestriction.count({ where: { type: ClubRestrictionType.BAN, revokedAt: null } }),

      this.prisma.clubPost.findMany({
        take: 5,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, username: true, email: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.clubComment.findMany({
        take: 5,
        where: { status: ClubCommentStatus.PENDING_REVIEW, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, username: true, email: true, subscriptionTier: true } },
          post: { select: { id: true, title: true } },
        },
      }),
      this.prisma.clubRestriction.findMany({
        take: 5,
        where: { revokedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, username: true, email: true, subscriptionTier: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, username: true } },
        },
      }),
      this.prisma.clubModerationLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, username: true } },
        },
      }),
      this.prisma.clubComment.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
      this.prisma.clubComment.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, deletedAt: null } }),
    ]);

    const commentTrendDirection =
      recent7DaysComments > prev7DaysComments ? 'UP' : recent7DaysComments < prev7DaysComments ? 'DOWN' : 'FLAT';
    const commentTrendValue =
      prev7DaysComments > 0 ? Math.round(((recent7DaysComments - prev7DaysComments) / prev7DaysComments) * 100) : 0;

    const stats = [
      {
        key: 'TOTAL_POSTS',
        label: 'Toplam Gönderi',
        value: totalPosts,
        secondaryText: `${publishedPosts} yayında · ${draftPosts} taslak · ${archivedPosts} arşivde`,
        severity: 'NORMAL',
      },
      {
        key: 'PUBLISHED_POSTS',
        label: 'Yayındaki Gönderi',
        value: publishedPosts,
        secondaryText: 'Topluluğa açık ana gönderiler',
        severity: 'INFO',
      },
      {
        key: 'TOTAL_COMMENTS',
        label: 'Toplam Yorum',
        value: totalComments,
        secondaryText: `Bugün ${todayCommentsCount} · İncelemede ${pendingCommentsCount}`,
        trend: {
          value: Math.abs(commentTrendValue),
          direction: commentTrendDirection,
          period: 'Son 7 gün, önceki 7 güne göre',
        },
        severity: 'NORMAL',
      },
      {
        key: 'PENDING_COMMENTS',
        label: 'İncelemede Bekleyen',
        value: pendingCommentsCount,
        secondaryText: pendingCommentsCount > 0 ? 'Müdahale bekleyen yorumlar var' : 'Bekleyen inceleme yok',
        severity: pendingCommentsCount > 0 ? 'WARNING' : 'NORMAL',
      },
      {
        key: 'ACTIVE_MODERATORS',
        label: 'Aktif Moderatör',
        value: activeModeratorsCount,
        secondaryText: 'Yetkilendirilmiş moderasyon ekibi',
        severity: 'NORMAL',
      },
      {
        key: 'ACTIVE_MUTES',
        label: 'Geçici Susturulan',
        value: activeMutesCount,
        secondaryText: 'Süre kısıtlaması aktif üyeler',
        severity: activeMutesCount > 0 ? 'WARNING' : 'NORMAL',
      },
      {
        key: 'ACTIVE_BANS',
        label: 'Yasaklı Kullanıcı',
        value: activeBansCount,
        secondaryText: 'Club erişimi engellenmiş hesaplar',
        severity: activeBansCount > 0 ? 'CRITICAL' : 'NORMAL',
      },
    ];

    return {
      stats,
      pendingComments: pendingComments.map(c => ({
        ...c,
        authorFormatted: formatUserDisplayName(c.author),
        badge: this.resolveUserPackageBadge(c.author),
      })),
      recentPosts: recentPosts.map(p => ({
        ...p,
        authorFormatted: formatUserDisplayName(p.author),
      })),
      activeRestrictions: activeRestrictions.map(r => ({
        ...r,
        userFormatted: formatUserDisplayName(r.user),
        createdByFormatted: formatUserDisplayName(r.createdBy),
      })),
      recentActivity,
      engagementSummary: {
        range: '7D',
        postViews: Math.max(120, totalPosts * 350 + totalComments * 12),
        totalComments: recent7DaysComments,
        uniqueActiveUsers: Math.max(1, Math.round(totalComments * 0.6)),
        clubVisitors: Math.max(45, totalComments * 4),
        trends: {
          postViews: 18.6,
          comments: Math.abs(commentTrendValue) || 12.3,
          activeUsers: 10.2,
          visitors: 8.4,
        },
      },
    };
  }

  async getAdminPosts(status?: string) {
    const where: any = { deletedAt: null };
    if (status && status !== 'ALL') {
      where.status = status as ClubPostStatus;
    }

    const posts = await this.prisma.clubPost.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, firstName: true, lastName: true, username: true, email: true } },
        media: true,
        _count: { select: { comments: true } },
      },
    });

    return posts.map(p => ({
      ...p,
      authorFormatted: formatUserDisplayName(p.author),
    }));
  }

  async getAdminComments(status?: string, customerNo?: string) {
    const where: any = { deletedAt: null };
    if (status && status !== 'ALL') {
      where.status = status as ClubCommentStatus;
    }

    const comments = await this.prisma.clubComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, username: true, email: true, subscriptionTier: true } },
        post: { select: { id: true, title: true } },
      },
    });

    let filtered = comments;
    if (customerNo) {
      filtered = comments.filter(c => formatCustomerNo(c.author).toLowerCase().includes(customerNo.toLowerCase()));
    }

    return filtered.map(c => ({
      ...c,
      authorFormatted: formatUserDisplayName(c.author),
      badge: this.resolveUserPackageBadge(c.author),
    }));
  }

  async getAdminModerators() {
    const moderators = await this.prisma.clubModeratorAssignment.findMany({
      where: { revokedAt: null },
      orderBy: { assignedAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, email: true, subscriptionTier: true } },
        assignedByAdmin: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
    });

    return moderators.map((m: any) => ({
      ...m,
      userFormatted: formatUserDisplayName(m.user),
      assignedByFormatted: formatUserDisplayName(m.assignedByAdmin),
      badge: this.resolveUserPackageBadge(m.user),
    }));
  }

  async getAdminRestrictions(type?: string, status?: string) {
    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = type as ClubRestrictionType;
    }
    if (status === 'ACTIVE') {
      where.revokedAt = null;
    }

    const restrictions = await this.prisma.clubRestriction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, email: true, subscriptionTier: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
    });

    return restrictions.map(r => ({
      ...r,
      userFormatted: formatUserDisplayName(r.user),
      createdByFormatted: formatUserDisplayName(r.createdBy),
      badge: this.resolveUserPackageBadge(r.user),
    }));
  }

  async searchUsers(query: string, isModerator: boolean = false) {
    const clean = (query || '').trim().toLowerCase();
    if (!clean) return [];

    const orConditions: any[] = [
      { firstName: { contains: clean, mode: 'insensitive' } },
      { lastName: { contains: clean, mode: 'insensitive' } },
      { username: { contains: clean, mode: 'insensitive' } },
    ];
    if (!isModerator) {
      orConditions.push({ email: { contains: clean, mode: 'insensitive' } });
    }

    const users = await this.prisma.user.findMany({
      where: { OR: orConditions },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: !isModerator,
        role: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });

    return users.map(u => ({
      id: u.id,
      customerNo: formatCustomerNo(u),
      displayName: formatUserDisplayName(u),
      role: u.role,
      subscriptionTier: u.subscriptionTier,
      badge: this.resolveUserPackageBadge(u),
      email: isModerator ? undefined : (u as any).email,
    }));
  }

  async getClubUserProfile(customerNo: string, isModerator: boolean = false) {
    const allUsers = await this.prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true, subscriptionTier: true, createdAt: true },
    });

    const user = allUsers.find(u => formatCustomerNo(u) === customerNo || u.id === customerNo);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const [commentsCount, hiddenCommentsCount, activeRestrictions, moderationLogs] = await Promise.all([
      this.prisma.clubComment.count({ where: { authorId: user.id, deletedAt: null } }),
      this.prisma.clubComment.count({ where: { authorId: user.id, status: ClubCommentStatus.HIDDEN, deletedAt: null } }),
      this.prisma.clubRestriction.findMany({ where: { userId: user.id, revokedAt: null } }),
      this.prisma.clubModerationLog.findMany({ where: { targetUserId: user.id }, take: 10, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      id: user.id,
      customerNo: formatCustomerNo(user),
      displayName: formatUserDisplayName(user),
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      badge: this.resolveUserPackageBadge(user),
      email: isModerator ? undefined : user.email,
      stats: {
        totalComments: commentsCount,
        hiddenComments: hiddenCommentsCount,
        activeRestrictionsCount: activeRestrictions.length,
      },
      activeRestrictions,
      moderationLogs,
    };
  }

  async getClubAdminConversations() {
    const convs = await this.prisma.conversation.findMany({
      where: { contextType: ConversationContextType.CLUB_ADMIN },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, username: true, email: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    return convs.map(c => ({
      ...c,
      userFormatted: formatUserDisplayName(c.buyer),
      lastMessage: c.messages[0]?.body || '',
      lastMessageAt: c.messages[0]?.createdAt || c.lastMessageAt,
    }));
  }

  async getClubReports(section: string = 'ENGAGEMENT', range: string = '30D') {
    const totalPosts = await this.prisma.clubPost.count({ where: { deletedAt: null } });
    const totalComments = await this.prisma.clubComment.count({ where: { deletedAt: null } });
    const hiddenComments = await this.prisma.clubComment.count({ where: { status: ClubCommentStatus.HIDDEN } });

    return {
      section,
      range,
      metrics: {
        totalVisitors: Math.max(100, totalComments * 5),
        uniqueCommenters: Math.max(5, Math.round(totalComments * 0.7)),
        totalComments,
        hiddenComments,
        avgCommentsPerPost: totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0,
      },
    };
  }

  getClubSettings() {
    return this.clubSettings;
  }

  updateClubSettings(dto: any) {
    if (dto.rulesText !== undefined) this.clubSettings.rulesText = dto.rulesText;
    if (dto.supportUrl !== undefined) this.clubSettings.supportUrl = dto.supportUrl;
    if (dto.commentCharLimit !== undefined) {
      this.clubSettings.commentCharLimit = Math.max(100, Math.min(3000, dto.commentCharLimit));
    }
    if (dto.commentRateLimitSeconds !== undefined) {
      this.clubSettings.commentRateLimitSeconds = Math.max(5, Math.min(60, dto.commentRateLimitSeconds));
    }
    if (dto.dailyCommentLimit !== undefined) {
      this.clubSettings.dailyCommentLimit = Math.max(1, Math.min(100, dto.dailyCommentLimit));
    }
    if (dto.maxImagesPerPost !== undefined) {
      this.clubSettings.maxImagesPerPost = Math.max(1, Math.min(10, dto.maxImagesPerPost));
    }
    return this.clubSettings;
  }

  async getAdminStats() {
    const totalPosts = await this.prisma.clubPost.count({ where: { deletedAt: null } });
    const totalComments = await this.prisma.clubComment.count({ where: { deletedAt: null } });
    const activeModerators = await this.prisma.clubModeratorAssignment.count({ where: { revokedAt: null } });
    const activeMutes = await this.prisma.clubRestriction.count({ where: { type: ClubRestrictionType.MUTE, revokedAt: null } });
    const activeBans = await this.prisma.clubRestriction.count({ where: { type: ClubRestrictionType.BAN, revokedAt: null } });

    return {
      totalPosts,
      totalComments,
      activeModerators,
      activeMutes,
      activeBans,
    };
  }

  async getModerationLogs(limit: number = 50) {
    return this.prisma.clubModerationLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });
  }
}
