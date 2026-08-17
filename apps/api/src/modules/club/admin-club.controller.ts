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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClubService } from './club.service';
import {
  CreateClubPostDto,
  UpdateClubPostDto,
  MuteUserDto,
  BanUserDto,
  AdminDirectMessageDto,
  UpdateClubSettingsDto,
  BulkCommentStatusDto,
  BulkAssignModeratorDto,
  BulkAdminMessageDto,
  GetAdminUsersQueryDto,
} from './club.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';

@Controller(['admin/club', 'api/admin/club'])
@UseGuards(JwtAuthGuard)
export class AdminClubController {
  constructor(private readonly clubService: ClubService) {}

  private async verifyModeratorOrAdmin(req: any) {
    const userId = req.user?.id;
    const email = req.user?.email;
    const ADMIN_EMAILS = [
      'efeguven9991@gmail.com',
      'm.efeeguven@gmail.com',
      'burhanseckin08@gmail.com',
      'burhanseckin08@icloud.com',
    ];
    if (
      req.user?.role === Role.ADMIN ||
      req.user?.role === Role.SUPER_ADMIN ||
      (email && ADMIN_EMAILS.includes(email.toLowerCase()))
    ) {
      return 'ADMIN';
    }
    const role = await this.clubService.getUserClubRole(userId);
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      throw new ForbiddenException('Bu işlem için moderatör veya admin yetkisi gereklidir.');
    }
    return role;
  }

  private async verifyAdminOnly(req: any) {
    const userId = req.user?.id;
    const email = req.user?.email;
    const ADMIN_EMAILS = [
      'efeguven9991@gmail.com',
      'm.efeeguven@gmail.com',
      'burhanseckin08@gmail.com',
      'burhanseckin08@icloud.com',
    ];
    if (
      req.user?.role === Role.ADMIN ||
      req.user?.role === Role.SUPER_ADMIN ||
      (email && ADMIN_EMAILS.includes(email.toLowerCase()))
    ) {
      return;
    }
    const role = await this.clubService.getUserClubRole(userId);
    if (role !== 'ADMIN') {
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

  @Post(['comments/:commentId/restore', 'comments/:commentId/publish', 'comments/:commentId/approve'])
  async restoreComment(@Param('commentId') commentId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.restoreComment(commentId, req.user.id, role);
  }

  @Delete('comments/:commentId')
  @Post('comments/:commentId/delete')
  async deleteCommentAdmin(@Param('commentId') commentId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.deleteComment(commentId, req.user.id, role);
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

  @Post('media/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(@UploadedFile() file: any, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.uploadPostMedia(file, req.user.id);
  }

  @Post('posts')
  async createPost(@Body() dto: CreateClubPostDto, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.createPost(req.user.id, dto);
  }

  @Patch('posts/:postId')
  async updatePost(@Param('postId') postId: string, @Body() dto: UpdateClubPostDto, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.updatePost(postId, dto);
  }

  @Post('posts/:postId/publish')
  async publishPost(@Param('postId') postId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.publishPost(postId);
  }

  @Post('posts/:postId/archive')
  async archivePost(@Param('postId') postId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.archivePost(postId);
  }

  @Post('polls/:pollId/close')
  async closePoll(@Param('pollId') pollId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.closePoll(pollId, req.user.id);
  }

  @Patch('polls/:pollId/end-time')
  async extendPollEndTime(
    @Param('pollId') pollId: string,
    @Body('endsAt') endsAt: string,
    @Req() req: any,
  ) {
    await this.verifyAdminOnly(req);
    return this.clubService.extendPollEndTime(pollId, endsAt, req.user.id);
  }

  @Post('polls/:pollId/export')
  async exportPollResults(@Param('pollId') pollId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.exportPollResults(pollId);
  }

  @Patch('posts/:postId/comments-toggle')
  async toggleComments(@Param('postId') postId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.togglePostComments(postId);
  }

  @Post('users/:userId/ban')
  async banUser(@Param('userId') userId: string, @Body() dto: BanUserDto, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.banUser(userId, req.user.id, dto.reason);
  }

  @Post('users/:userId/unban')
  async unbanUser(@Param('userId') userId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.unbanUser(userId, req.user.id);
  }

  @Post('moderators/:userId')
  async assignModerator(@Param('userId') userId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.assignModerator(userId, req.user.id);
  }

  @Delete('moderators/:userId')
  async revokeModerator(@Param('userId') userId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.revokeModerator(userId, req.user.id);
  }

  @Post('users/:userId/message')
  async sendDirectMessage(
    @Param('userId') userId: string,
    @Body() dto: AdminDirectMessageDto,
    @Req() req: any,
  ) {
    await this.verifyAdminOnly(req);
    return this.clubService.sendAdminDirectMessage(userId, req.user.id, dto);
  }

  @Get('dashboard')
  async getDashboardData(@Req() req: any) {
    await this.verifyModeratorOrAdmin(req);
    return this.clubService.getAdminDashboardData();
  }

  @Get('posts')
  async getPosts(@Query('status') status: string, @Req() req: any) {
    await this.verifyModeratorOrAdmin(req);
    return this.clubService.getAdminPosts(status);
  }

  @Get('comments')
  async getComments(
    @Query('status') status: string,
    @Query('customerNo') customerNo: string,
    @Req() req: any,
  ) {
    await this.verifyModeratorOrAdmin(req);
    return this.clubService.getAdminComments(status, customerNo);
  }

  @Get('moderators')
  async getModerators(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.getAdminModerators();
  }

  @Get('restrictions')
  async getRestrictions(
    @Query('type') type: string,
    @Query('status') status: string,
    @Req() req: any,
  ) {
    await this.verifyModeratorOrAdmin(req);
    return this.clubService.getAdminRestrictions(type, status);
  }

  @Get('users/search')
  async searchUsers(@Query('q') query: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    const isModerator = role === 'MODERATOR';
    return this.clubService.searchUsers(query, isModerator);
  }

  @Get('users/:customerNo')
  async getClubUserProfile(@Param('customerNo') customerNo: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    const isModerator = role === 'MODERATOR';
    return this.clubService.getClubUserProfile(customerNo, isModerator);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.getClubAdminConversations();
  }

  @Get('reports')
  async getReports(
    @Query('section') section: string,
    @Query('range') range: string,
    @Req() req: any,
  ) {
    await this.verifyAdminOnly(req);
    return this.clubService.getClubReports(section, range);
  }

  @Get('settings')
  async getSettings(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.getClubSettings();
  }

  @Patch('settings')
  async updateSettings(@Body() dto: UpdateClubSettingsDto, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.updateClubSettings(dto);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.getAdminStats();
  }

  @Get(['moderation-log', 'activity', 'audit-log'])
  async getModerationLogs(@Query('limit') limit?: string, @Req() req?: any) {
    await this.verifyAdminOnly(req);
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.clubService.getModerationLogs(parsedLimit);
  }

  // ==========================
  // V3.1 EXTENDED ENDPOINTS
  // ==========================

  @Post('restrictions/:restrictionId/revoke')
  async revokeRestriction(@Param('restrictionId') restrictionId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.revokeRestriction(restrictionId, req.user.id, role);
  }

  @Post('restrictions/:restrictionId/unmute')
  async unmuteRestriction(@Param('restrictionId') restrictionId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.revokeRestriction(restrictionId, req.user.id, role);
  }

  @Post('restrictions/:restrictionId/unban')
  async unbanRestriction(@Param('restrictionId') restrictionId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.revokeRestriction(restrictionId, req.user.id, role);
  }

  @Post('users/:userId/unmute')
  async unmuteUser(@Param('userId') userId: string, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.revokeRestriction(userId, req.user.id, role);
  }

  @Get('comments/groups')
  async getCommentGroups(@Query('status') status: string, @Req() req: any) {
    await this.verifyModeratorOrAdmin(req);
    return this.clubService.getCommentGroups(status);
  }

  @Get('posts/:postId/comments')
  async getPostComments(
    @Param('postId') postId: string,
    @Query('status') status: string,
    @Query('cursor') cursor: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    await this.verifyModeratorOrAdmin(req);
    const parsedLimit = limit ? parseInt(limit, 10) : 25;
    return this.clubService.getPostComments(postId, status, cursor, parsedLimit);
  }

  @Post('comments/bulk-status')
  async bulkUpdateCommentStatus(@Body() dto: BulkCommentStatusDto, @Req() req: any) {
    const role = await this.verifyModeratorOrAdmin(req);
    return this.clubService.bulkUpdateCommentStatus(dto.commentIds, dto.targetStatus as any, req.user.id, role);
  }

  @Get('users')
  async getAdminUsersList(@Query() query: GetAdminUsersQueryDto, @Req() req: any) {
    await this.verifyModeratorOrAdmin(req);
    return this.clubService.getAdminUsersList(query);
  }

  @Post('moderators/bulk-assign')
  async bulkAssignModerators(@Body() dto: BulkAssignModeratorDto, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.bulkAssignModerators(dto.userIds, req.user.id);
  }

  @Post('messages/bulk')
  async sendBulkAdminMessage(@Body() dto: BulkAdminMessageDto, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.sendBulkAdminMessage(dto.userIds, req.user.id, dto.content, dto.sendNotification);
  }

  @Get('messages/bulk/:jobId')
  async getBulkMessageJobStatus(@Param('jobId') jobId: string, @Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.clubService.getBulkMessageJobStatus(jobId);
  }
}
