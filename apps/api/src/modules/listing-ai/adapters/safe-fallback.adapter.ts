import { Injectable } from '@nestjs/common';
import { AiProviderAdapter, AiProviderResponse } from './ai-provider.interface';

@Injectable()
export class SafeFallbackAdapter implements AiProviderAdapter {
  readonly providerName = 'SafeFallbackProvider';

  async generateAnswer(
    systemPrompt: string,
    userMessage: string,
    contextJson: any,
  ): Promise<AiProviderResponse> {
    const listing = contextJson?.listing || {};
    const vehicle = contextJson?.vehicle || {};
    const condition = contextJson?.condition || {};
    const missing = contextJson?.missingFields || [];
    const warnings = contextJson?.warnings || [];

    const brand = vehicle.brand || 'Belirtilmemiş';
    const model = vehicle.model || 'Belirtilmemiş';
    const year = vehicle.year ? `${vehicle.year} model` : 'Model yılı belirtilmemiş';
    const mileage = vehicle.mileageKm ? `${vehicle.mileageKm.toLocaleString('tr-TR')} km` : 'Kilometre belirtilmemiş';
    const price = listing.price ? `${parseFloat(listing.price.amount).toLocaleString('tr-TR')} ${listing.price.currency}` : 'Fiyat belirtilmemiş';
    const fuel = vehicle.fuelType || 'Yakıt türü belirtilmemiş';
    const transmission = vehicle.transmission || 'Şanzıman belirtilmemiş';

    let answer = `### İlan Verilerine Dayalı Değerlendirme\n\n`;
    answer += `**Temel Bilgiler:**\n`;
    answer += `• **Araç:** ${brand} ${model} (${year})\n`;
    answer += `• **Fiyat & Kilometre:** ${price} | ${mileage}\n`;
    answer += `• **Yakıt & Şanzıman:** ${fuel} | ${transmission}\n\n`;

    if (condition.heavyDamageDeclared) {
      answer += `⚠️ **Ağır Hasar Beyanı:** Satıcı ilanda aracın ağır hasarlı olduğunu beyan etmiştir.\n\n`;
    } else {
      answer += `✓ **Hasar Durumu:** İlanda ağır hasar beyanı bulunmamaktadır.\n\n`;
    }

    if (condition.paintedParts?.length > 0 || condition.changedParts?.length > 0) {
      answer += `**Kaporta Beyanları:**\n`;
      if (condition.paintedParts?.length > 0) {
        answer += `• Boyalı parçalar: ${condition.paintedParts.join(', ')}\n`;
      }
      if (condition.changedParts?.length > 0) {
        answer += `• Değişen parçalar: ${condition.changedParts.join(', ')}\n`;
      }
      answer += `\n`;
    }

    if (missing.length > 0) {
      answer += `**İlandaki Eksik Bilgiler:**\n`;
      missing.forEach((field: string) => {
        answer += `• İlanda **${field}** alanı belirtilmemiş.\n`;
      });
      answer += `\n`;
    }

    if (warnings.length > 0) {
      answer += `**Dikkat Edilmesi Gereken Çelişki / Uyarılar:**\n`;
      warnings.forEach((w: any) => {
        answer += `• ${w.message}\n`;
      });
      answer += `\n`;
    }

    answer += `**Satıcıya Sorulması Gerekenler:**\n`;
    answer += `1. Periyodik bakım geçmişi ve servis faturaları mevcut mu?\n`;
    answer += `2. Tramer / hasar kaydı sorgu belgesi paylaşılabilir mi?\n`;
    answer += `3. Araç üzerinde ekspertizde öncelikle kontrol ettirilmesi gereken bir nokta var mı?\n\n`;
    answer += `*Bu değerlendirme ilan sahibi tarafından girilen bilgiler üzerinden hazırlanmıştır. Bağımsız ekspertiz yerine geçmez.*`;

    return {
      answer,
      providerName: this.providerName,
      tokenCount: 0,
    };
  }
}
