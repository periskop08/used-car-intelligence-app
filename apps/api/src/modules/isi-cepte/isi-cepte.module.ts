import { Module } from '@nestjs/common';
import { IsiCepteService } from './isi-cepte.service';
import { AdminIsiCepteController } from './admin-isi-cepte.controller';
import { IsiCepteController } from './isi-cepte.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AdminIsiCepteController, IsiCepteController],
  providers: [IsiCepteService, PrismaService],
  exports: [IsiCepteService],
})
export class IsiCepteModule {}
