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
