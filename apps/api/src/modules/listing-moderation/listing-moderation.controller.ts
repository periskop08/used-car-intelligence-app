import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ListingModerationService } from './listing-moderation.service';

const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
  'burhanseckin08@icloud.com',
];

@Controller('admin/listing-moderation')
@UseGuards(JwtAuthGuard)
export class ListingModerationController {
  constructor(private readonly moderationService: ListingModerationService) {}

  private verifyAdminAccess(req: any) {
    const email = req?.user?.email;
    const role = req?.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || (email && ADMIN_EMAILS.includes(email));
    if (!isAdmin) {
      throw new ForbiddenException('İlan moderasyon merkezine yalnızca yöneticiler erişebilir.');
    }
  }

  @Get('status-counts')
  async getStatusCounts(@Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.getStatusCounts();
  }

  @Get('items')
  async getModerationItems(@Query() query: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.getModerationItems(query);
  }

  @Get('reasons')
  async getReasons(@Query('actionType') actionType: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.getModerationReasons(actionType);
  }

  @Get('sellers')
  async getSellers(@Query() query: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.getSellers(query);
  }

  @Get('sellers/:customerNo/listings')
  async getSellerListings(
    @Param('customerNo') customerNo: string,
    @Query('status') status: string,
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.moderationService.getSellerListings(customerNo, status);
  }

  @Get('listings/:listingId')
  async getListingDetails(@Param('listingId') listingId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.getListingDetails(listingId);
  }

  @Post('listings/:listingId/approve')
  async approveListing(@Param('listingId') listingId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.approveListing(listingId, req.user);
  }

  @Post('listings/:listingId/request-revision')
  async requestRevision(
    @Param('listingId') listingId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.moderationService.requestRevision(listingId, body, req.user);
  }

  @Post('listings/:listingId/send-to-detailed-review')
  async sendToDetailedReview(
    @Param('listingId') listingId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.moderationService.sendToDetailedReview(listingId, body, req.user);
  }

  @Post('listings/:listingId/reject')
  async rejectListing(
    @Param('listingId') listingId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.moderationService.rejectListing(listingId, body, req.user);
  }

  @Post('listings/:listingId/set-passive')
  async setPassive(@Param('listingId') listingId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.setPassive(listingId, req.user);
  }

  @Post('listings/:listingId/activate')
  async activateListing(
    @Param('listingId') listingId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.moderationService.activateListing(listingId, body, req.user);
  }

  @Post('listings/:listingId/reopen')
  async reopenListing(@Param('listingId') listingId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.reopenListing(listingId, req.user);
  }

  @Post('media/:mediaId/approve')
  async approveMedia(@Param('mediaId') mediaId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.moderateMedia(mediaId, 'APPROVED');
  }

  @Post('media/:mediaId/reject')
  async rejectMedia(@Param('mediaId') mediaId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.moderateMedia(mediaId, 'REJECTED');
  }

  @Post('sellers/:customerNo/listings/bulk-action')
  async bulkAction(
    @Param('customerNo') customerNo: string,
    @Body() body: any,
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.moderationService.bulkAction(customerNo, body, req.user);
  }

  @Post('listings/:listingId/lock')
  async acquireLock(@Param('listingId') listingId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.acquireLock(listingId, req.user);
  }

  @Delete('listings/:listingId/lock')
  async releaseLock(@Param('listingId') listingId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.moderationService.releaseLock(listingId);
  }
}
