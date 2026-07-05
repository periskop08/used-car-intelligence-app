import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { FeatureLimitModule } from './modules/feature-limit/feature-limit.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { ReviewModule } from './modules/review/review.module';
import { ReportModule } from './modules/report/report.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { ComparisonModule } from './modules/comparison/comparison.module';
import { ResearchModule } from './modules/research/research.module';

@Module({
  imports: [
    AuthModule,
    SubscriptionModule,
    FeatureLimitModule,
    VehicleModule,
    ReviewModule,
    ReportModule,
    FavoriteModule,
    ComparisonModule,
    ResearchModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
