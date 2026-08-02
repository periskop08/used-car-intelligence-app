import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClubService } from './club.service';
import {
  CreateClubCommentDto,
  UpdateClubCommentDto,
  CastPollVoteDto,
  UpdatePollEndTimeDto,
} from './club.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('club')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get('posts')
  async getPosts(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.clubService.getPublishedPosts(userId, cursor, parsedLimit);
  }

  @Get('posts/pinned')
  async getPinnedPosts() {
    return this.clubService.getPinnedPosts();
  }

  @Get('posts/:postId')
  async getPostDetail(@Param('postId') postId: string, @Req() req?: any) {
    const userId = req?.user?.id;
    return this.clubService.getPostDetail(postId, userId);
  }

  @Get('posts/:postId/comments')
  async getComments(
    @Param('postId') postId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 30;
    return this.clubService.getComments(postId, cursor, parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments')
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateClubCommentDto,
    @Req() req: any,
  ) {
    return this.clubService.addComment(postId, req.user.id, dto.content, dto.replyToCommentId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('comments/:commentId')
  async editComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateClubCommentDto,
    @Req() req: any,
  ) {
    return this.clubService.editComment(commentId, req.user.id, dto.content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  async deleteComment(@Param('commentId') commentId: string, @Req() req: any) {
    const clubRole = await this.clubService.getUserClubRole(req.user.id);
    return this.clubService.deleteComment(commentId, req.user.id, clubRole);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/like')
  async toggleLike(@Param('postId') postId: string, @Req() req: any) {
    return this.clubService.togglePostLike(postId, req.user.id);
  }

  // ==========================================
  // POLL ENDPOINTS
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Put('polls/:pollId/my-vote')
  async castVote(
    @Param('pollId') pollId: string,
    @Body() dto: CastPollVoteDto,
    @Req() req: any,
  ) {
    return this.clubService.castVote(pollId, req.user.id, dto.optionIds);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('polls/:pollId/my-vote')
  async withdrawVote(@Param('pollId') pollId: string, @Req() req: any) {
    return this.clubService.withdrawVote(pollId, req.user.id);
  }

  @Get('polls/:pollId/results')
  async getPollResults(@Param('pollId') pollId: string, @Req() req?: any) {
    const userId = req?.user?.id;
    return this.clubService.getPollResults(pollId, userId);
  }
}
