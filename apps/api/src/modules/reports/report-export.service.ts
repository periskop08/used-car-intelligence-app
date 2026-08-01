import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportExportJobStatus } from '@prisma/client';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createExportJob(requestedById: string, reportType: string, format: 'CSV' | 'XLSX', filters: any) {
    const job = await (this.prisma as any).reportExportJob.create({
      data: {
        requestedById,
        reportType,
        format,
        filters: filters || {},
        status: ReportExportJobStatus.PENDING,
        progressPercent: 0,
      },
    });

    // Dispatch async processing
    setImmediate(() => this.processExportJob(job.id));

    return job;
  }

  async getExportJobStatus(jobId: string, userId: string) {
    const job = await (this.prisma as any).reportExportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) throw new NotFoundException('Export işi bulunamadı.');

    return {
      ...job,
      downloadUrl: job.status === ReportExportJobStatus.COMPLETED ? `/api/admin/reports/exports/${job.id}/download` : undefined,
    };
  }

  private async processExportJob(jobId: string) {
    try {
      await (this.prisma as any).reportExportJob.update({
        where: { id: jobId },
        data: { status: ReportExportJobStatus.PROCESSING, progressPercent: 20, startedAt: new Date() },
      });

      const job = await (this.prisma as any).reportExportJob.findUnique({ where: { id: jobId } });
      if (!job) return;

      // Dummy generation simulation or UTF-8 CSV build
      const rows = [
        ['Müşteri No', 'Ad Soyad', 'Paket', 'Tarih'],
        ['TS-2608-000123', 'Mehmet Efe Güven', 'YETKIN', new Date().toISOString()],
      ];

      let fileContent = '';
      if (job.format === 'CSV') {
        fileContent = '\uFEFF' + rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
      } else {
        fileContent = rows.map((r) => r.join('\t')).join('\n');
      }

      const storageKey = `exports/${job.id}.${job.format.toLowerCase()}`;
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

      await (this.prisma as any).reportExportJob.update({
        where: { id: jobId },
        data: {
          status: ReportExportJobStatus.COMPLETED,
          progressPercent: 100,
          rowCount: rows.length - 1,
          fileName: `report_${job.reportType}_${Date.now()}.${job.format.toLowerCase()}`,
          storageKey,
          mimeType: job.format === 'CSV' ? 'text/csv' : 'application/vnd.ms-excel',
          fileSizeBytes: BigInt(Buffer.byteLength(fileContent, 'utf8')),
          fileUrl: fileContent, // In memory / DB fallback
          expiresAt,
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      await (this.prisma as any).reportExportJob.update({
        where: { id: jobId },
        data: {
          status: ReportExportJobStatus.FAILED,
          failureReason: err.message,
          errorCode: 'EXPORT_FAILED',
        },
      });
    }
  }

  async getExportFile(jobId: string) {
    const job = await (this.prisma as any).reportExportJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== ReportExportJobStatus.COMPLETED) {
      throw new NotFoundException('İndirilecek dosya bulunamadı.');
    }
    return {
      fileName: job.fileName,
      mimeType: job.mimeType,
      content: job.fileUrl || '',
    };
  }
}
