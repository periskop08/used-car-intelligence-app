import { Module } from '@nestjs/common';
import { IsiCepteService } from './isi-cepte.service';
import { AdminIsiCepteController } from './admin-isi-cepte.controller';
import { IsiCepteController } from './isi-cepte.controller';
import { PrismaService } from '../../prisma.service';
import { NullIsiCepteFeedProvider } from './null-isicepte-feed.provider';
import { ISICEPTE_FEED_PROVIDER } from './isicepte-feed-provider.interface';

@Module({
  controllers: [AdminIsiCepteController, IsiCepteController],
  providers: [
    IsiCepteService,
    PrismaService,
    {
      provide: ISICEPTE_FEED_PROVIDER,
      useClass: NullIsiCepteFeedProvider,
    },
  ],
  exports: [IsiCepteService, ISICEPTE_FEED_PROVIDER],
})
export class IsiCepteModule {}

