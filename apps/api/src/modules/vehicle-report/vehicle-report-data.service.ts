import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class VehicleReportDataService {
  constructor(private prisma: PrismaService) {}

  async getApprovedProblems(variantId: string) {
    return this.prisma.commonProblem.findMany({
      where: { variantId, status: 'APPROVED' },
      orderBy: { riskLevel: 'desc' },
    });
  }

  async getApprovedRecalls(variantId: string) {
    return this.prisma.recall.findMany({
      where: { variantId, status: 'APPROVED' },
    });
  }

  async getApprovedChecklists(variantId: string) {
    return this.prisma.inspectionChecklistItem.findMany({
      where: { variantId, status: 'APPROVED' },
    });
  }
}
