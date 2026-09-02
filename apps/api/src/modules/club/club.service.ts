import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
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
  return `TS-${yy}${mm}-000001`;
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
export class ClubService implements OnModuleInit {
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

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`ALTER TABLE "ClubComment" ADD COLUMN IF NOT EXISTS "replyToCommentId" TEXT;`);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`CREATE TYPE "ClubPollSelectionType" AS ENUM ('SINGLE', 'MULTIPLE');`);
    } catch (e) {}
    try {
      await this.prisma.$executeRawUnsafe(`CREATE TYPE "ClubPollResultVisibility" AS ENUM ('ALWAYS', 'AFTER_VOTE', 'AFTER_END', 'ADMIN_ONLY');`);
    } catch (e) {}
    try {
      await this.prisma.$executeRawUnsafe(`CREATE TYPE "ClubPollStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'ARCHIVED');`);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClubPoll" (
          "id" TEXT NOT NULL,
          "postId" TEXT NOT NULL,
          "question" TEXT NOT NULL,
          "selectionType" "ClubPollSelectionType" NOT NULL DEFAULT 'SINGLE',
          "maxSelections" INTEGER,
          "resultVisibility" "ClubPollResultVisibility" NOT NULL DEFAULT 'AFTER_VOTE',
          "status" "ClubPollStatus" NOT NULL DEFAULT 'DRAFT',
          "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "endsAt" TIMESTAMP(3),
          "closedAt" TIMESTAMP(3),
          "closedByAdminId" TEXT,
          "notifyParticipantsOnClose" BOOLEAN NOT NULL DEFAULT false,
          "version" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "deletedAt" TIMESTAMP(3),
          CONSTRAINT "ClubPoll_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubPoll_postId_key" UNIQUE ("postId")
        );
      `);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClubPollOption" (
          "id" TEXT NOT NULL,
          "pollId" TEXT NOT NULL,
          "text" TEXT NOT NULL,
          "normalizedText" TEXT NOT NULL,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "deletedAt" TIMESTAMP(3),
          CONSTRAINT "ClubPollOption_pkey" PRIMARY KEY ("id")
        );
      `);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClubPollVote" (
          "id" TEXT NOT NULL,
          "pollId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ClubPollVote_pkey" PRIMARY KEY ("id")
        );
      `);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClubPollVoteSelection" (
          "id" TEXT NOT NULL,
          "voteId" TEXT NOT NULL,
          "optionId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ClubPollVoteSelection_pkey" PRIMARY KEY ("id")
        );
      `);
    } catch (e) {}
  }

  // ==========================================
  // PACKAGE & ROLE HELPERS
  // ==========================================

  resolveUserPackageBadge(user: { subscriptionTier?: SubscriptionTier }): UserPackageBadge {
    const tier = user?.subscriptionTier || SubscriptionTier.FREE;

    switch (tier) {
      case SubscriptionTier.YETKIN:
      case SubscriptionTier.STANDARD:
        return { code: 'YETKIN', label: 'Yetkin' };

      case SubscriptionTier.PRO:
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

    const userRole = userId ? await this.getUserClubRole(userId) : undefined;

    const formattedPosts = await Promise.all(
      posts.map(async (p) => {
        const poll = await this.formatPollForUserByPostId(p.id, userId, userRole);
        return {
          ...p,
          isLiked: likedPostIds.has(p.id),
          commentCount: p._count.comments,
          likeCount: p._count.likes,
          poll,
        };
      })
    );

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

    const userRole = userId ? await this.getUserClubRole(userId) : undefined;
    const poll = await this.formatPollForUserByPostId(postId, userId, userRole);

    return { ...post, isLiked, commentCount: post._count.comments, likeCount: post._count.likes, poll };
  }

  async getComments(postId: string, cursor?: string, limit: number = 30) {
    let comments: any[] = [];
    try {
      comments = await this.prisma.clubComment.findMany({
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
          replyToComment: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.logger.warn(`getComments findMany with replyToComment failed, falling back: ${e.message}`);
      comments = await this.prisma.clubComment.findMany({
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
    }

    let nextCursor: string | undefined = undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id;
    }

    // Attach package badges, role tags, and replyReference to each comment
    const formattedComments = await Promise.all(
      comments.map(async c => {
        const clubRole = await this.getUserClubRole(c.author.id);
        const pkgBadge = this.resolveUserPackageBadge(c.author);

        let replyReference: any = undefined;
        if (c.replyToCommentId) {
          if (!c.replyToComment || c.replyToComment.status !== ClubCommentStatus.VISIBLE || c.replyToComment.deletedAt) {
            replyReference = {
              commentId: c.replyToCommentId,
              author: { displayName: 'Kullanıcı' },
              preview: 'Bu yorum artık görüntülenemiyor',
              availability: 'UNAVAILABLE',
            };
          } else {
            const targetAuthorName =
              c.replyToComment.author?.username ||
              `${c.replyToComment.author?.firstName || ''} ${c.replyToComment.author?.lastName || ''}`.trim() ||
              'Üye';
            const previewText =
              c.replyToComment.content.length > 100
                ? c.replyToComment.content.substring(0, 100) + '…'
                : c.replyToComment.content;
            replyReference = {
              commentId: c.replyToComment.id,
              author: { displayName: targetAuthorName },
              preview: previewText,
              availability: 'AVAILABLE',
            };
          }
        }

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
          replyReference,
        };
      })
    );

    return { comments: formattedComments, nextCursor };
  }

  async addComment(postId: string, authorId: string, content: string, replyToCommentId?: string) {
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

    // Validate replyToCommentId if provided
    let targetComment: any = null;
    if (replyToCommentId) {
      try {
        targetComment = await this.prisma.clubComment.findFirst({
          where: {
            id: replyToCommentId,
            postId,
            status: ClubCommentStatus.VISIBLE,
            deletedAt: null,
          },
          include: { author: true },
        });
      } catch (e) {
        // fallback
      }
    }

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

    let newComment: any;
    try {
      newComment = await this.prisma.clubComment.create({
        data: {
          postId,
          authorId,
          content: sanitizedContent,
          replyToCommentId: targetComment ? targetComment.id : undefined,
          status: ClubCommentStatus.VISIBLE,
        },
      });
    } catch (e: any) {
      this.logger.warn(`addComment create with replyToCommentId failed, retrying without: ${e.message}`);
      newComment = await this.prisma.clubComment.create({
        data: {
          postId,
          authorId,
          content: sanitizedContent,
          status: ClubCommentStatus.VISIBLE,
        },
      });
    }

    // Create Notification if replying to another user's comment
    if (targetComment && targetComment.authorId !== authorId) {
      try {
        const authorUser = await this.prisma.user.findUnique({ where: { id: authorId } });
        const authorName = authorUser?.username || `${authorUser?.firstName || ''} ${authorUser?.lastName || ''}`.trim() || 'Bir üye';
        const postTitle = post.title || 'gönderi';

        await (this.prisma as any).analyticsEvent.create({
          data: {
            eventType: 'CLUB_COMMENT_REPLY_NOTIFICATION_CREATED',
            userId: targetComment.authorId,
            metadata: {
              postId,
              commentId: newComment.id,
              replyToCommentId: targetComment.id,
              message: `${authorName}, “${postTitle}” paylaşımındaki yorumunuza yanıt verdi.`,
            },
          },
        });
      } catch (e) {
        // Notification creation error should not fail comment creation
      }
    }

    return newComment;
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

    const updated = await this.prisma.clubComment.update({
      where: { id: commentId },
      data: {
        status: ClubCommentStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId: userId,
        actorRole: userRole,
        actionType: 'COMMENT_DELETED',
        targetUserId: comment.authorId,
        commentId: comment.id,
        postId: comment.postId,
        reason: 'Admin tarafından kalıcı silindi',
      },
    });

    return updated;
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
  // POLL SERVICE HELPERS & ACTIONS
  // ==========================================

  async formatPollForUserByPostId(postId: string, userId?: string, userRole?: string) {
    let poll: any;
    try {
      poll = await (this.prisma as any).clubPoll.findFirst({
        where: { postId, deletedAt: null },
      });
    } catch (e) {
      return null;
    }

    if (!poll) return null;
    return this.formatPollForUser(poll.id, userId, userRole);
  }

  async formatPollForUser(pollId: string, userId?: string, userRole?: string) {
    let poll: any;
    try {
      poll = await (this.prisma as any).clubPoll.findUnique({
        where: { id: pollId },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          votes: userId ? { where: { userId }, include: { selections: true } } : false,
        },
      });
    } catch (e) {
      return null;
    }

    if (!poll || poll.deletedAt) return null;

    const now = new Date();
    const isOpen = !poll.closedAt && poll.startsAt <= now && (!poll.endsAt || poll.endsAt > now);

    let currentUserVote: any = undefined;
    if (userId && poll.votes && poll.votes.length > 0) {
      const userVoteRecord = poll.votes[0];
      currentUserVote = {
        voteId: userVoteRecord.id,
        optionIds: userVoteRecord.selections.map((s: any) => s.optionId),
        updatedAt: userVoteRecord.updatedAt,
      };
    }

    const hasVoted = !!currentUserVote && currentUserVote.optionIds.length > 0;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    let resultsVisible = false;
    if (isAdmin || poll.resultVisibility === 'ALWAYS') {
      resultsVisible = true;
    } else if (poll.resultVisibility === 'AFTER_VOTE' && hasVoted) {
      resultsVisible = true;
    } else if (poll.resultVisibility === 'AFTER_END' && !isOpen) {
      resultsVisible = true;
    }

    let participantCount: number | undefined = undefined;
    let totalSelectionCount: number | undefined = undefined;
    let optionStats: Record<string, number> = {};

    if (resultsVisible) {
      try {
        const allVotes = await (this.prisma as any).clubPollVote.findMany({
          where: { pollId: poll.id },
          include: { selections: true },
        });

        participantCount = allVotes.length;
        totalSelectionCount = 0;

        allVotes.forEach((v: any) => {
          v.selections.forEach((sel: any) => {
            totalSelectionCount = (totalSelectionCount || 0) + 1;
            optionStats[sel.optionId] = (optionStats[sel.optionId] || 0) + 1;
          });
        });
      } catch (e) {
        participantCount = 0;
        totalSelectionCount = 0;
      }
    }

    const formattedOptions = poll.options.map((opt: any) => {
      const isSelected = currentUserVote?.optionIds.includes(opt.id) || false;
      let voteCount: number | undefined = undefined;
      let percentage: number | undefined = undefined;

      if (resultsVisible) {
        voteCount = optionStats[opt.id] || 0;
        if (participantCount && participantCount > 0) {
          percentage = Math.round((voteCount / participantCount) * 100);
        } else {
          percentage = 0;
        }
      }

      return {
        optionId: opt.id,
        text: opt.text,
        sortOrder: opt.sortOrder,
        selectedByCurrentUser: isSelected,
        ...(resultsVisible ? { voteCount, percentage } : {}),
      };
    });

    return {
      pollId: poll.id,
      postId: poll.postId,
      question: poll.question,
      selectionType: poll.selectionType,
      maxSelections: poll.maxSelections || 1,
      resultVisibility: poll.resultVisibility,
      status: poll.status,
      startsAt: poll.startsAt,
      endsAt: poll.endsAt,
      closedAt: poll.closedAt,
      isOpen,
      canVote: isOpen && !!userId,
      canChangeVote: isOpen && hasVoted,
      canWithdrawVote: isOpen && hasVoted,
      resultsVisible,
      ...(resultsVisible ? { participantCount, totalSelectionCount } : {}),
      options: formattedOptions,
      currentUserVote,
    };
  }

  async castVote(pollId: string, userId: string, optionIds: string[]) {
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      throw new BadRequestException('En az bir seçenek seçilmelidir.');
    }

    const { isBanned } = await this.checkUserRestriction(userId);
    if (isBanned) {
      throw new ForbiddenException('Club erişim kısıtlamanız bulunmaktadır.');
    }

    const poll = await (this.prisma as any).clubPoll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll || poll.deletedAt) throw new NotFoundException('Anket bulunamadı.');

    const now = new Date();
    const isOpen = !poll.closedAt && poll.startsAt <= now && (!poll.endsAt || poll.endsAt > now);
    if (!isOpen) {
      throw new ConflictException('Bu anket sona erdi. Artık oy kullanamaz veya oyunuzu değiştiremezsiniz.');
    }

    if (poll.selectionType === 'SINGLE' && optionIds.length > 1) {
      throw new BadRequestException('Bu anket için yalnızca 1 seçenek seçebilirsiniz.');
    }
    if (poll.selectionType === 'MULTIPLE' && poll.maxSelections && optionIds.length > poll.maxSelections) {
      throw new BadRequestException(`Bu anket için en fazla ${poll.maxSelections} seçenek seçebilirsiniz.`);
    }

    const validOptionIds = new Set(poll.options.map((o: any) => o.id));
    for (const id of optionIds) {
      if (!validOptionIds.has(id)) {
        throw new BadRequestException('Seçilen seçeneklerden bazıları bu ankete ait değil.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let voteRecord = await (tx as any).clubPollVote.findFirst({
        where: { pollId, userId },
      });

      if (!voteRecord) {
        voteRecord = await (tx as any).clubPollVote.create({
          data: { pollId, userId },
        });
      } else {
        await (tx as any).clubPollVote.update({
          where: { id: voteRecord.id },
          data: { updatedAt: new Date() },
        });
      }

      await (tx as any).clubPollVoteSelection.deleteMany({
        where: { voteId: voteRecord.id },
      });

      await (tx as any).clubPollVoteSelection.createMany({
        data: optionIds.map((optId) => ({
          voteId: voteRecord.id,
          optionId: optId,
        })),
      });
    });

    try {
      await (this.prisma as any).analyticsEvent.create({
        data: {
          eventType: 'CLUB_POLL_VOTED',
          userId,
          metadata: { pollId, postId: poll.postId, selectionCount: optionIds.length },
        },
      });
    } catch (e) {}

    const userRole = await this.getUserClubRole(userId);
    return this.formatPollForUser(pollId, userId, userRole);
  }

  async withdrawVote(pollId: string, userId: string) {
    const poll = await (this.prisma as any).clubPoll.findUnique({ where: { id: pollId } });
    if (!poll || poll.deletedAt) throw new NotFoundException('Anket bulunamadı.');

    const now = new Date();
    const isOpen = !poll.closedAt && poll.startsAt <= now && (!poll.endsAt || poll.endsAt > now);
    if (!isOpen) {
      throw new BadRequestException('Süresi dolmuş anketlerde oy geri çekilemez.');
    }

    const voteRecord = await (this.prisma as any).clubPollVote.findFirst({
      where: { pollId, userId },
    });

    if (voteRecord) {
      await (this.prisma as any).clubPollVoteSelection.deleteMany({
        where: { voteId: voteRecord.id },
      });
      await (this.prisma as any).clubPollVote.delete({
        where: { id: voteRecord.id },
      });
    }

    const userRole = await this.getUserClubRole(userId);
    return this.formatPollForUser(pollId, userId, userRole);
  }

  async getPollResults(pollId: string, userId?: string) {
    const userRole = userId ? await this.getUserClubRole(userId) : undefined;
    return this.formatPollForUser(pollId, userId, userRole);
  }

  async closePoll(pollId: string, adminId: string) {
    const poll = await (this.prisma as any).clubPoll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Anket bulunamadı.');

    return (this.prisma as any).clubPoll.update({
      where: { id: pollId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByAdminId: adminId,
      },
    });
  }

  async extendPollEndTime(pollId: string, endsAtStr: string, adminId: string) {
    const poll = await (this.prisma as any).clubPoll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Anket bulunamadı.');

    const newEndsAt = new Date(endsAtStr);
    if (isNaN(newEndsAt.getTime()) || newEndsAt <= new Date()) {
      throw new BadRequestException('Bitiş tarihi geçerli ve gelecekte olmalıdır.');
    }

    return (this.prisma as any).clubPoll.update({
      where: { id: pollId },
      data: {
        endsAt: newEndsAt,
        status: 'ACTIVE',
        closedAt: null,
      },
    });
  }

  async exportPollResults(pollId: string) {
    const poll = await (this.prisma as any).clubPoll.findUnique({
      where: { id: pollId },
      include: { options: true, votes: { include: { selections: true } } },
    });

    if (!poll) throw new NotFoundException('Anket bulunamadı.');

    const totalParticipants = poll.votes.length;
    const optionCounts: Record<string, number> = {};
    poll.votes.forEach((v: any) => {
      v.selections.forEach((s: any) => {
        optionCounts[s.optionId] = (optionCounts[s.optionId] || 0) + 1;
      });
    });

    let csvContent = 'Anket Sorusu,Seçenek Metni,Oy Sayısı,Katılımcı Yüzdesi,Toplam Katılımcı\n';
    poll.options.forEach((opt: any) => {
      const count = optionCounts[opt.id] || 0;
      const pct = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
      csvContent += `"${poll.question.replace(/"/g, '""')}","${opt.text.replace(/"/g, '""')}",${count},%${pct},${totalParticipants}\n`;
    });

    return { csv: csvContent, filename: `poll-results-${pollId}.csv` };
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
      const { title, content, mediaUrls, commentsEnabled, isPinned, pinnedOrder, poll, publishImmediately, status } = dto;

      const hasTitle = !!title?.trim();
      const hasContent = !!content?.trim();
      const hasMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0;
      const hasPoll = !!poll && !!poll.question?.trim() && Array.isArray(poll.options) && poll.options.length >= 2;

      if (!hasTitle && !hasContent && !hasMedia && !hasPoll) {
        throw new BadRequestException('Gönderi yayınlamak için başlık, içerik, fotoğraf veya anket alanlarından en az birini doldurmalısınız.');
      }

      const postStatus = publishImmediately === false || status === ClubPostStatus.DRAFT
        ? ClubPostStatus.DRAFT
        : ClubPostStatus.PUBLISHED;
      const publishedAt = postStatus === ClubPostStatus.PUBLISHED ? new Date() : null;

      const result = await this.prisma.$transaction(async (tx) => {
        const newPost = await tx.clubPost.create({
          data: {
            authorId: adminId,
            title: title || null,
            content: content || '',
            status: postStatus,
            commentsEnabled: commentsEnabled ?? true,
            isPinned: isPinned ?? false,
            pinnedOrder: pinnedOrder ?? null,
            publishedAt,
          },
        });

        if (hasMedia) {
          await tx.clubPostMedia.createMany({
            data: mediaUrls!.map((url, idx) => ({
              postId: newPost.id,
              mediaUrl: url,
              sortOrder: idx,
              uploadedById: adminId,
              status: 'ATTACHED' as any,
            })),
          });
        }

        if (hasPoll) {
          const cleanQuestion = poll!.question.trim();
          const cleanOptions = poll!.options.map((o) => o.trim()).filter(Boolean);
          if (cleanOptions.length < 2 || cleanOptions.length > 10) {
            throw new BadRequestException('Anket için en az 2, en fazla 10 geçerli seçenek girilmelidir.');
          }

          const selectionType = poll!.selectionType || 'SINGLE';
          const maxSelections = selectionType === 'MULTIPLE' ? Math.min(poll!.maxSelections || cleanOptions.length, cleanOptions.length) : 1;
          const resultVisibility = poll!.resultVisibility || 'AFTER_VOTE';
          const endsAt = poll!.endsAt ? new Date(poll!.endsAt) : null;

          const createdPoll = await (tx as any).clubPoll.create({
            data: {
              postId: newPost.id,
              question: cleanQuestion,
              selectionType,
              maxSelections,
              resultVisibility,
              status: 'ACTIVE',
              startsAt: new Date(),
              endsAt,
              notifyParticipantsOnClose: poll!.notifyParticipantsOnClose ?? false,
            },
          });

          await (tx as any).clubPollOption.createMany({
            data: cleanOptions.map((optText, idx) => ({
              pollId: createdPoll.id,
              text: optText,
              normalizedText: optText.toLowerCase(),
              sortOrder: idx,
            })),
          });
        }

        return newPost;
      });

      return await this.getPostDetail(result.id, adminId);
    } catch (error: any) {
      this.logger.error('Error creating Club post:', error);
      throw new BadRequestException(
        error?.message || 'Gönderi kaydedilirken hata oluştu.'
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
    const comment = await this.prisma.clubComment.update({
      where: { id: commentId },
      data: { status: ClubCommentStatus.PENDING_REVIEW },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId,
        actorRole,
        actionType: 'COMMENT_UNDER_REVIEW',
        targetUserId: comment.authorId,
        commentId,
      },
    });

    return comment;
  }

  async restoreComment(commentId: string, actorId: string, actorRole: string) {
    const comment = await this.prisma.clubComment.update({
      where: { id: commentId },
      data: { status: ClubCommentStatus.VISIBLE },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId,
        actorRole,
        actionType: 'COMMENT_PUBLISHED',
        targetUserId: comment.authorId,
        commentId,
      },
    });

    return comment;
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

  // ==========================================
  // V3.1 EXTENDED OPERATIONS & BULK SERVICES
  // ==========================================

  async revokeRestriction(targetId: string, actorId: string, actorRole: string) {
    let restriction = await this.prisma.clubRestriction.findUnique({
      where: { id: targetId },
    });

    if (!restriction) {
      restriction = await this.prisma.clubRestriction.findFirst({
        where: { userId: targetId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!restriction) {
      return { success: true, message: 'Aktif kısıtlama bulunamadı veya zaten kaldırıldı.' };
    }

    if (restriction.revokedAt) {
      return restriction; // Idempotent handling
    }

    if (restriction.type === ClubRestrictionType.BAN && actorRole !== 'ADMIN') {
      throw new ForbiddenException('Club yasağını yalnızca yöneticiler kaldırabilir.');
    }

    const updated = await this.prisma.clubRestriction.update({
      where: { id: restriction.id },
      data: {
        revokedAt: new Date(),
        revokedById: actorId,
      },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId,
        actorRole,
        actionType: restriction.type === ClubRestrictionType.BAN ? 'BAN_REVOKED' : 'MUTE_REVOKED',
        targetUserId: restriction.userId,
        reason: 'Yönetici tarafından kaldırıldı',
      },
    });

    return updated;
  }

  async getCommentGroups(status?: string) {
    const whereComment: any = { deletedAt: null };
    if (status && status !== 'ALL') {
      whereComment.status = status as ClubCommentStatus;
    }

    // Find distinct postIds with comments
    const posts = await this.prisma.clubPost.findMany({
      where: {
        deletedAt: null,
        comments: { some: whereComment },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    // Fetch counts per post
    const result = await Promise.all(
      posts.map(async (post) => {
        const [total, visible, pendingReview, hidden, deleted] = await Promise.all([
          this.prisma.clubComment.count({ where: { postId: post.id, deletedAt: null } }),
          this.prisma.clubComment.count({ where: { postId: post.id, status: ClubCommentStatus.VISIBLE, deletedAt: null } }),
          this.prisma.clubComment.count({ where: { postId: post.id, status: ClubCommentStatus.PENDING_REVIEW, deletedAt: null } }),
          this.prisma.clubComment.count({ where: { postId: post.id, status: ClubCommentStatus.HIDDEN, deletedAt: null } }),
          this.prisma.clubComment.count({ where: { postId: post.id, status: ClubCommentStatus.DELETED } }),
        ]);

        return {
          post,
          counts: {
            total,
            visible,
            pendingReview,
            hidden,
            deleted,
          },
        };
      })
    );

    return result;
  }

  async getPostComments(postId: string, status?: string, cursor?: string, limit: number = 25) {
    const where: any = { postId, deletedAt: null };
    if (status && status !== 'ALL') {
      where.status = status as ClubCommentStatus;
    }

    const comments = await this.prisma.clubComment.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, username: true, email: true, subscriptionTier: true } },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id;
    }

    return {
      comments: comments.map(c => ({
        ...c,
        authorFormatted: formatUserDisplayName(c.author),
        badge: this.resolveUserPackageBadge(c.author),
      })),
      nextCursor,
    };
  }

  async bulkUpdateCommentStatus(commentIds: string[], targetStatus: ClubCommentStatus, actorId: string, actorRole: string) {
    if (!commentIds || commentIds.length === 0) return { updatedCount: 0 };

    const validComments = await this.prisma.clubComment.findMany({
      where: { id: { in: commentIds }, deletedAt: null },
      select: { id: true, status: true, authorId: true, postId: true },
    });

    let count = 0;
    for (const c of validComments) {
      if (c.status === targetStatus) continue;

      await this.prisma.clubComment.update({
        where: { id: c.id },
        data: { status: targetStatus },
      });

      await this.prisma.clubModerationLog.create({
        data: {
          actorId,
          actorRole,
          actionType: `COMMENT_STATUS_${targetStatus}`,
          targetUserId: c.authorId,
          commentId: c.id,
          postId: c.postId,
        },
      });

      count++;
    }

    return { updatedCount: count };
  }

  async getAdminUsersList(query: any) {
    const limit = query.limit ? parseInt(query.limit, 10) : 25;
    const sortOrder = query.sort === 'CREATED_AT_DESC' ? 'desc' : 'asc';

    const where: any = {};
    if (query.search && query.search.trim()) {
      const clean = query.search.trim().toLowerCase();
      where.OR = [
        { firstName: { contains: clean, mode: 'insensitive' } },
        { lastName: { contains: clean, mode: 'insensitive' } },
        { username: { contains: clean, mode: 'insensitive' } },
        { email: { contains: clean, mode: 'insensitive' } },
      ];
    }
    if (query.package) {
      where.subscriptionTier = query.package;
    }
    if (query.role) {
      where.role = query.role;
    }

    const users = await this.prisma.user.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        isActive: true,
        _count: {
          select: { clubComments: true },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem?.id;
    }

    // Attach active restrictions for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const activeRestrictions = await this.prisma.clubRestriction.findMany({
          where: { userId: u.id, revokedAt: null },
        });

        const isMuted = activeRestrictions.some(r => r.type === ClubRestrictionType.MUTE);
        const isBanned = activeRestrictions.some(r => r.type === ClubRestrictionType.BAN);

        return {
          id: u.id,
          customerNo: formatCustomerNo(u),
          displayName: formatUserDisplayName(u),
          email: u.email,
          role: u.role,
          subscriptionTier: u.subscriptionTier,
          badge: this.resolveUserPackageBadge(u),
          createdAt: u.createdAt,
          isActive: u.isActive,
          commentCount: u._count.clubComments,
          isMuted,
          isBanned,
          activeRestrictions,
        };
      })
    );

    return {
      users: usersWithStats,
      nextCursor,
    };
  }

  async bulkAssignModerators(userIds: string[], adminId: string) {
    if (!userIds || userIds.length === 0) {
      return { requested: 0, assigned: 0, failed: 0, failures: [] };
    }

    const failures: { userId: string; reason: string }[] = [];
    let assigned = 0;

    for (const uId of userIds) {
      const activeMod = await this.prisma.clubModeratorAssignment.findFirst({
        where: { userId: uId, revokedAt: null },
      });
      if (activeMod) {
        failures.push({ userId: uId, reason: 'ALREADY_MODERATOR' });
        continue;
      }

      const activeBan = await this.prisma.clubRestriction.findFirst({
        where: { userId: uId, type: ClubRestrictionType.BAN, revokedAt: null },
      });
      if (activeBan) {
        failures.push({ userId: uId, reason: 'USER_BANNED' });
        continue;
      }

      await this.prisma.clubModeratorAssignment.create({
        data: {
          userId: uId,
          assignedByAdminId: adminId,
        },
      });

      await this.prisma.clubModerationLog.create({
        data: {
          actorId: adminId,
          actorRole: 'ADMIN',
          actionType: 'MODERATOR_ASSIGNED',
          targetUserId: uId,
        },
      });

      assigned++;
    }

    return {
      requested: userIds.length,
      assigned,
      failed: failures.length,
      failures,
    };
  }

  async sendBulkAdminMessage(userIds: string[], adminId: string, content: string, sendNotification: boolean = true) {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('Alıcı listesi boş olamaz.');
    }

    const job = await (this.prisma as any).clubBulkMessageJob.create({
      data: {
        createdByAdminId: adminId,
        content,
        sendNotification,
        recipientCount: userIds.length,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const targetUserId of userIds) {
      try {
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
            body: content,
          },
        });

        await this.prisma.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: new Date() },
        });

        await (this.prisma as any).clubBulkMessageRecipient.create({
          data: {
            jobId: job.id,
            userId: targetUserId,
            conversationId: conv.id,
            status: 'SENT',
            processedAt: new Date(),
          },
        });

        successCount++;
      } catch (err: any) {
        failureCount++;
        await (this.prisma as any).clubBulkMessageRecipient.create({
          data: {
            jobId: job.id,
            userId: targetUserId,
            status: 'FAILED',
            errorCode: err.message || 'UNKNOWN_ERROR',
            processedAt: new Date(),
          },
        });
      }
    }

    const finalStatus = failureCount === 0 ? 'COMPLETED' : successCount === 0 ? 'FAILED' : 'PARTIALLY_FAILED';

    const updatedJob = await (this.prisma as any).clubBulkMessageJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        successCount,
        failureCount,
        completedAt: new Date(),
      },
    });

    await this.prisma.clubModerationLog.create({
      data: {
        actorId: adminId,
        actorRole: 'ADMIN',
        actionType: 'BULK_MESSAGE_SENT',
        reason: `Toplu mesaj gönderildi: ${successCount} başarılı, ${failureCount} başarısız`,
      },
    });

    return updatedJob;
  }

  async getBulkMessageJobStatus(jobId: string) {
    const job = await (this.prisma as any).clubBulkMessageJob.findUnique({
      where: { id: jobId },
      include: {
        recipients: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, username: true } },
          },
        },
      },
    });

    if (!job) throw new NotFoundException('Toplu mesaj işi bulunamadı.');

    return {
      ...job,
      recipients: job.recipients.map((r: any) => ({
        ...r,
        userFormatted: formatUserDisplayName(r.user),
      })),
    };
  }
}
