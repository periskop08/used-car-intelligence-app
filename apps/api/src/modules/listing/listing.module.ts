import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingService } from './listing.service';
import { R2Service } from './r2.service';
import { ListingController } from './listing.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [ListingController],
  providers: [PrismaService, ListingService, JwtService, R2Service],
  exports: [ListingService, R2Service],
})
export class ListingModule implements OnModuleInit {
  constructor(private listingService: ListingService) {}

  onModuleInit() {
    // Run cron check every hour
    setInterval(() => {
      this.listingService.cronCheckListingExpirations()
        .then(res => {
          if (res.deactivatedCount > 0 || res.expiredCount > 0) {
            console.log(`[ListingCron] Expiration check: Deactivated ${res.deactivatedCount}, Expired ${res.expiredCount} listings.`);
          }
        })
        .catch(err => console.error('[ListingCron] Error:', err.message));
    }, 60 * 60 * 1000);
  }
}
