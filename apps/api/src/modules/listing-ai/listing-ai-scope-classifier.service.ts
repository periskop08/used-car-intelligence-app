import { Injectable } from '@nestjs/common';

export interface ScopeClassifierResult {
  isOutOfScope: boolean;
  redirectMessage?: string;
}

@Injectable()
export class ListingAiScopeClassifierService {
  classify(message: string): ScopeClassifierResult {
    const msg = message.toLowerCase().trim();

    // 1. Explicit comparison against totally different vehicles (e.g. "clio ile karşılaştır", "golf mu c2 mi")
    if ((msg.includes('kıyasla') || msg.includes('karşılaştır')) && !msg.includes('bu ilan')) {
      return {
        isOutOfScope: true,
        redirectMessage:
          'Bu danışman yalnızca açık olan ilandaki aracı analiz eder. Farklı marka/modellerle yan yana karşılaştırma yapmak için menüdeki **Araç Karşılaştırma** bölümünü kullanabilirsiniz.',
      };
    }

    // 2. Budget vehicle search recommendations (e.g. "500 bine araba öner")
    if ((msg.includes('araba öner') || msg.includes('araç öner') || msg.includes('bütçeme göre')) && !msg.includes('bu araç')) {
      return {
        isOutOfScope: true,
        redirectMessage:
          'Bu danışman yalnızca seçili ilandaki aracı değerlendirir. Bütçenize göre genel ilan listelerini **Araç Bul / Keşfet** bölümünde listeleyebilirsiniz.',
      };
    }

    // All model-specific questions (chronic issues, transmission, engine, city use, etc.) pass to AI!
    return { isOutOfScope: false };
  }
}
