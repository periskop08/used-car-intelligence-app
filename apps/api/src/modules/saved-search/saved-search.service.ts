import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSavedSearchDto, UpdateSavedSearchAlertDto } from './saved-search.dto';

@Injectable()
export class SavedSearchService {
  constructor(private prisma: PrismaService) {}

  async getSavedSearches(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSavedSearch(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        title: dto.title,
        filters: dto.filters,
      },
    });
  }

  async updateAlerts(userId: string, id: string, dto: UpdateSavedSearchAlertDto) {
    const search = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search) {
      throw new NotFoundException('Kayıtlı arama bulunamadı.');
    }

    if (search.userId !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    const dataToUpdate: any = {};
    if (dto.isEmailAlertActive !== undefined) dataToUpdate.isEmailAlertActive = dto.isEmailAlertActive;
    if (dto.isPushAlertActive !== undefined) dataToUpdate.isPushAlertActive = dto.isPushAlertActive;

    return this.prisma.savedSearch.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async deleteSavedSearch(userId: string, id: string) {
    const search = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search) {
      throw new NotFoundException('Kayıtlı arama bulunamadı.');
    }

    if (search.userId !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    await this.prisma.savedSearch.delete({
      where: { id },
    });

    return { message: 'Kayıtlı arama başarıyla silindi.' };
  }
}
