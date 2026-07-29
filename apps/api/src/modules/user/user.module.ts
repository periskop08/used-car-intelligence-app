import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [UserController],
  providers: [UserService, SubscriptionService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
