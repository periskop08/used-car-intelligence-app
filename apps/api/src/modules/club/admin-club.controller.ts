import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ClubService } from './club.service';
import {
  CreateClubPostDto,
  UpdateClubPostDto,
  MuteUserDto,
  BanUserDto,
  AdminDirectMessageDto,
} from './club.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';

@Controller('admin/club')
@UseGuards(JwtAuthGuard)
export class AdminClubController {
  constructor(private readonly clubService: ClubService) {}

  private async verifyModeratorOrAdmin(req: any) {
    const userId = req.user.id;
    const role = await this.clubService.getUserClubRole(userId);
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      throw new ForbiddenException('Bu işlem için moderatör veya admin yetkisi gereklidir.');
    }
    return role;
  }

  private verifyAdminOnly(req: any) {
    if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Bu işlem yalnızca yöneticiler (Admin) tarafından yapılabilir.');
    }
  }

  // ==========================
  // MODERATOR & ADMIN ROUTES
  // ==========================

  @Post('comments/:commentId/hide')
  async hideComment(
    @Param('commentId') commentId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.hideComment(commentId, req.user.id, role, reason);
  }

  @Post('comments/:commentId/review')
  async reviewComment(@Param('commentId') commentId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.reviewComment(commentId, req.user.id, role);
  }

  @Post('comments/:commentId/restore')
  async restoreComment(@Param('commentId') commentId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.restoreComment(commentId, req.user.id, role);
  }

  @Post('users/:userId/mute')
  async muteUser(
    @Param('userId') userId: string,
    @Body() dto: MuteUserDto,
    @Req() req: any,
  ) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.muteUser(userId, req.user.id, role, dto);
  }

  // ==========================
  // ADMIN ONLY ROUTES
  // ==========================

  @Post('posts')
  async createPost(@Body() dto: CreateClubPostDto, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.createPost(req.user.id, dto);
  }

  @Patch('posts/:postId')
  async updatePost(@Param('postId') postId: string, @Body() dto: UpdateClubPostDto, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.updatePost(postId, dto);
  }

  @Post('posts/:postId/publish')
  async publishPost(@Param('postId') postId: string, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.publishPost(postId);
  }

  @Post('posts/:postId/archive')
  async archivePost(@Param('postId') postId: string, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.archivePost(postId);
  }

  @Patch('posts/:postId/comments-toggle')
  async toggleComments(@Param('postId') postId: string, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.togglePostComments(postId);
  }

  @Post('users/:userId/ban')
  async banUser(@Param('userId') userId: string, @Body() dto: BanUserDto, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.banUser(userId, req.user.id, dto.reason);
  }

  @Post('users/:userId/unban')
  async unbanUser(@Param('userId') userId: string, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.unbanUser(userId, req.user.id);
  }

  @Post('moderators/:userId')
  async assignModerator(@Param('userId') userId: string, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.assignModerator(userId, req.user.id);
  }

  @Delete('moderators/:userId')
  async revokeModerator(@Param('userId') userId: string, @Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.revokeModerator(userId, req.user.id);
  }

  @Post('users/:userId/message')
  async sendDirectMessage(
    @Param('userId') userId: string,
    @Body() dto: AdminDirectMessageDto,
    @Req() req: any,
  ) {
    this.verifyAdminOnly(req);
    return this.clubService.sendAdminDirectMessage(userId, req.user.id, dto);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    this.verifyAdminOnly(req);
    return this.clubService.getAdminStats();
  }

  @Get('moderation-log')
  async getModerationLogs(@Query('limit') limit?: string, @Req() req?: any) {
    this.verifyAdminOnly(req);
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.clubService.getModerationLogs(parsedLimit);
  }
}
