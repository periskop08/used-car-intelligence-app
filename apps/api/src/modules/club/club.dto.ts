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

export class CreateClubPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(3)
  content: string;

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
