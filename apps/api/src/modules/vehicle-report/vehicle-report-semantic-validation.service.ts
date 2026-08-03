import { Injectable, Logger } from '@nestjs/common';
import { ComprehensiveVehicleReport } from '@used-car-intelligence/shared';

@Injectable()
export class VehicleReportSemanticValidationService {
  private readonly logger = new Logger(VehicleReportSemanticValidationService.name);

  validate(report: ComprehensiveVehicleReport, contextJson: any): { isValid: boolean; reason?: string; needsRepair?: boolean } {
    if (!report || !report.executiveSummary || !report.vehicleIdentity) {
      return { isValid: false, reason: 'Rapor nesnesi veya zorunlu bölümler eksik.', needsRepair: true };
    }

    const reportStr = JSON.stringify(report).toLowerCase();
    const vehicleCtx = contextJson?.vehicleIdentity || {};

    // Rule 1: Engine code hallucination check
    if (report.vehicleIdentity.engineCode && vehicleCtx.engineCode) {
      if (report.vehicleIdentity.engineCode.toLowerCase() !== vehicleCtx.engineCode.toLowerCase()) {
        return {
          isValid: false,
          reason: `Motor kodu bağlam dışı uyduruldu (${report.vehicleIdentity.engineCode} vs ${vehicleCtx.engineCode}).`,
          needsRepair: true,
        };
      }
    }

    // Rule 2: Seller declaration represented as absolute fact check
    if (reportStr.includes('araç kesinlikle kazasızdır') || reportStr.includes('kesinlikle orijinaldir')) {
      return {
        isValid: false,
        reason: 'Satıcı beyanı veya araç durumu kesin kanıtlanmış gerçek olarak sunuldu.',
        needsRepair: true,
      };
    }

    // Rule 3: Absolute buy/walk away commands check
    if (reportStr.includes('bu aracı sakın alma') || reportStr.includes('kesinlikle satın alın')) {
      return {
        isValid: false,
        reason: 'Kullanıcıya emredici "kesin al" veya "kesin alma" ifadesi kullanıldı.',
        needsRepair: true,
      };
    }

    // Rule 4: Visual photo analysis claim check
    if (reportStr.includes('fotoğraflardan anlaşıldığı üzere boyası temiz') || reportStr.includes('görsellerden hasarlı olduğu görülüyor')) {
      return {
        isValid: false,
        reason: 'Görsel analiz yapılmadığı halde fotoğraftan teknik/boya hükmü verildi.',
        needsRepair: true,
      };
    }

    return { isValid: true };
  }
}
