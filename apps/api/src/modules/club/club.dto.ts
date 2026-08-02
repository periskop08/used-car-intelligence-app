import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClubPollDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  question: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsOptional()
  @IsEnum(['SINGLE', 'MULTIPLE'])
  selectionType?: 'SINGLE' | 'MULTIPLE';

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  maxSelections?: number;

  @IsOptional()
  @IsEnum(['ALWAYS', 'AFTER_VOTE', 'AFTER_END', 'ADMIN_ONLY'])
  resultVisibility?: 'ALWAYS' | 'AFTER_VOTE' | 'AFTER_END' | 'ADMIN_ONLY';

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  notifyParticipantsOnClose?: boolean;
}

export class CastPollVoteDto {
  @IsArray()
  @IsString({ each: true })
  optionIds: string[];
}

export class UpdatePollEndTimeDto {
  @IsString()
  endsAt: string;
}

export class CreateClubPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsInt()
  pinnedOrder?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClubPollDto)
  poll?: CreateClubPollDto;
}

export class UpdateClubPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsInt()
  pinnedOrder?: number;
}

export class CreateClubCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsString()
  replyToCommentId?: string;
}

export class UpdateClubCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

export class MuteUserDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  durationDays?: number; // max 7 days for moderator
}

export class BanUserDto {
  @IsString()
  reason: string;
}

export class AdminDirectMessageDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsString()
  commentId?: string;
}

export class ReorderPinnedPostsDto {
  @IsArray()
  @IsString({ each: true })
  postIds: string[];
}

export type ClubDashboardStatKey =
  | 'TOTAL_POSTS'
  | 'PUBLISHED_POSTS'
  | 'TOTAL_COMMENTS'
  | 'PENDING_COMMENTS'
  | 'ACTIVE_MODERATORS'
  | 'ACTIVE_MUTES'
  | 'ACTIVE_BANS';

export interface ClubDashboardStat {
  key: ClubDashboardStatKey;
  label: string;
  value: number;
  secondaryText?: string;
  trend?: {
    value: number;
    direction: 'UP' | 'DOWN' | 'FLAT';
    period: string;
  };
  severity?: 'NORMAL' | 'INFO' | 'WARNING' | 'CRITICAL';
}

export class UpdateClubSettingsDto {
  @IsOptional()
  @IsString()
  rulesText?: string;

  @IsOptional()
  @IsString()
  supportUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(3000)
  commentCharLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  commentRateLimitSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyCommentLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxImagesPerPost?: number;
}

export class BulkCommentStatusDto {
  @IsArray()
  @IsString({ each: true })
  commentIds: string[];

  @IsEnum(['VISIBLE', 'HIDDEN', 'PENDING_REVIEW'])
  targetStatus: 'VISIBLE' | 'HIDDEN' | 'PENDING_REVIEW';
}

export class BulkAssignModeratorDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class BulkAdminMessageDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean;
}

export class GetAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: 'CREATED_AT_ASC' | 'CREATED_AT_DESC';

  @IsOptional()
  @IsString()
  package?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
