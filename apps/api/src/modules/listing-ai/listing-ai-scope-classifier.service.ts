import { Injectable } from '@nestjs/common';

export interface ScopeClassifierResult {
  isOutOfScope: boolean;
  redirectMessage?: string;
}

@Injectable()
export class ListingAiScopeClassifierService {
  classify(message: string): ScopeClassifierResult {
    const msg = message.toLowerCase().trim();

    // 1. Comparison queries
    const comparisonKeywords = ['kıyasla', 'karşılaştır', 'daha mı iyi', 'mı daha iyi', 'veya mı', 'yoksa', ' vs ', ' vs.', ' mı ', ' mi ', ' mu ', ' mü '];
    const isComparison = comparisonKeywords.some((kw) => msg.includes(kw));

    if (isComparison) {
      return {
        isOutOfScope: true,
        redirectMessage:
          'Bu danışman yalnızca açık olan ilanı değerlendirir. Başka araçlarla karşılaştırma yapmak için lütfen menüdeki **Araç Karşılaştırma** bölümünü kullanın.',
      };
    }

    // 2. Chronic issues / General vehicle encyclopedia queries
    const chronicKeywords = ['kronik sorun', 'kronik arıza', 'kronikleri neler', 'genel kronik', 'kronik probleml'];
    const isChronicQuery = chronicKeywords.some((kw) => msg.includes(kw));

    if (isChronicQuery) {
      return {
        isOutOfScope: true,
        redirectMessage:
          'Bu ilan bağlamında doğrulanmış kronik sorun kaydı bulunmuyor. Genel marka/model kronik arıza verileri için lütfen **Araç Sorgulama** bölümünü kullanın.',
      };
    }

    // 3. Search / Market recommendation queries
    const searchKeywords = ['araba öner', 'araç öner', 'bütçeme göre', 'fiyata araba', 'piyasa araması'];
    const isSearchQuery = searchKeywords.some((kw) => msg.includes(kw));

    if (isSearchQuery) {
      return {
        isOutOfScope: true,
        redirectMessage:
          'Bu danışman yalnızca bu ilandaki aracı değerlendirir. Genel bütçe ve piyasa tavsiyeleri için **Araç Bul / Keşfet** bölümünü kullanabilirsiniz.',
      };
    }

    return { isOutOfScope: false };
  }
}
