import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { IsiCepteService } from './isi-cepte.service';
import { PrismaService } from '../../prisma.service';

@ApiTags('Admin İşi Cepte Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['admin/isi-cepte', 'api/admin/isi-cepte'])
export class AdminIsiCepteController {
  constructor(
    private readonly isiCepteService: IsiCepteService,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyAdminOnly(req: any) {
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Yetkisiz erişim.');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Bu işlem için admin yetkisi gereklidir.');
    }
  }

  @Get('overview')
  @ApiOperation({ summary: 'İşi Cepte Admin Genel Bakış' })
  async getOverview(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.isiCepteService.getOverview();
  }

  @Get('providers')
  @ApiOperation({ summary: 'İşi Cepte İşletmeler ve Ustalar Listesi' })
  async getProviders(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.isiCepteService.getProviders();
  }

  @Get('regional-visibility')
  @ApiOperation({ summary: 'Bölgesel Görünürlük Kayıtları' })
  async getRegionalVisibility(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.isiCepteService.getRegionalVisibility();
  }

  @Get('showcase')
  @ApiOperation({ summary: 'Vitrin Görünürlük Hakları' })
  async getShowcase(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.isiCepteService.getShowcase();
  }

  @Get('national-visibility')
  @ApiOperation({ summary: 'Ülke Geneli Görünürlük Hakları' })
  async getNationalVisibility(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.isiCepteService.getNationalVisibility();
  }

  @Get('purchases')
  @ApiOperation({ summary: 'İşi Cepte Satın Alım Günlüğü (Salt Okunur)' })
  async getPurchases(@Req() req: any) {
    await this.verifyAdminOnly(req);
    return this.isiCepteService.getPurchases();
  }
}
