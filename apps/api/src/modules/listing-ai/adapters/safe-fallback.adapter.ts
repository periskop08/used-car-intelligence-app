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
    const msg = (userMessage || '').toLowerCase();

    // 1. Specific Question: City Use / Şehir içi
    if (msg.includes('şehir içi') || msg.includes('sehir ici') || msg.includes('şehirde')) {
      let answer = `### Şehir İçi Kullanım Değerlendirmesi\n\n`;
      answer += `• **İlandaki Araç:** ${brand} ${model} (${year})\n`;
      answer += `• **Yakıt & Şanzıman:** ${fuel} | ${transmission}\n`;
      answer += `• **Kilometre:** ${mileage}\n\n`;

      if (transmission.toLowerCase().includes('manuel')) {
        answer += `• **Şanzıman Tipi:** Manuel şanzıman yoğun şehir içi trafikte otomatik şanzımanlara kıyasla sürekli vites değişimi gerektireceğinden daha yorucu olabilir.\n`;
      } else if (transmission.toLowerCase().includes('otomatik') || transmission.toLowerCase().includes('at') || transmission.toLowerCase().includes('dsg')) {
        answer += `• **Şanzıman Tipi:** Otomatik şanzıman şehir içi dur-kalk trafikte yüksek kullanım konforu sağlar.\n`;
      }

      if (fuel.toLowerCase().includes('dizel')) {
        answer += `• **Yakıt Özelliği:** Dizel motorlar çok kısa mesafeli şehir içi dur-kalk kullanımlarında DPF (Dizel Partikül Filtresi) dolma riski taşıyabilir. Düzenli uzun yol yapılmayacaksa DPF durumu satıcıya sorulmalıdır.\n`;
      } else if (fuel.toLowerCase().includes('benzin')) {
        answer += `• **Yakıt Özelliği:** Benzinli motor kısa şehir içi mesafelerine çabuk ısınarak uyum sağlar.\n`;
      }

      answer += `\n*Not: Bu değerlendirme ilanda beyan edilen şanzıman ve yakıt verilerine göre hazırlanmıştır.*`;
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 2. Specific Question: Major Risks / En büyük riskler
    if (msg.includes('risk') || msg.includes('tehlike') || msg.includes('dikkat edilecek')) {
      let answer = `### İlandaki Temel Risk Değerlendirmesi\n\n`;
      answer += `• **Araç:** ${brand} ${model} (${year}) - ${mileage}\n\n`;

      if (condition.heavyDamageDeclared) {
        answer += `⚠️ **1. Ağır Hasar Kaydı:** İlanda aracın ağır hasarlı olduğu beyan edilmiştir. En önemli risk faktörüdür. Ekspertizde şasi, podye, direkler ve airbag kontrolleri eksiksiz yapılmalıdır.\n`;
      } else {
        answer += `✓ **1. Hasar Kaydı:** İlanda ağır hasar beyanı bulunmamaktadır.\n`;
      }

      if (missing.length > 0) {
        answer += `⚠️ **2. Eksik Bilgi Riski:** İlanda **${missing.join(', ')}** alanları boş bırakılmıştır.\n`;
      }

      if (warnings.length > 0) {
        answer += `⚠️ **3. Sistem Uyarısı:** ${warnings.map((w: any) => w.message).join('; ')}\n`;
      }

      answer += `\n*Detaylı ekspertiz raporu olmadan satın alma kararı verilmemelidir.*`;
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 3. Specific Question: Questions for Seller / Satıcıya sorular
    if (msg.includes('satıcıya') || msg.includes('sormalı') || msg.includes('soru')) {
      let answer = `### Satıcıya Sorulması Gereken Öncelikli Sorular\n\n`;
      answer += `1. **Servis & Bakım:** Periyodik bakım geçmişi ve servis faturaları kayıtlı mı?\n`;
      answer += `2. **Hasar Sorgu:** Tramer sorgulama belgesi ve ekspertiz raporu paylaşılabilir mi?\n`;
      answer += `3. **Muayene & Lastik:** Aracın fenni muayene bitiş tarihi ve lastik üretim yılı nedir?\n`;
      if (missing.length > 0) {
        answer += `4. **Eksik Alanlar:** İlanda belirtilmeyen **${missing.join(', ')}** bilgileri nelerdir?\n`;
      }
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 4. Specific Question: Mileage vs Age / Kilometre ve Yaş
    if (msg.includes('kilometre') || msg.includes('km') || msg.includes('yaş')) {
      const currentYear = new Date().getFullYear();
      const vehicleYear = vehicle.year || currentYear;
      const age = Math.max(1, currentYear - vehicleYear);
      const km = vehicle.mileageKm || 0;
      const avgPerYear = Math.round(km / age);

      let answer = `### Kilometre ve Yaş Dengesi Analizi\n\n`;
      answer += `• **Model Yılı:** ${vehicleYear} (${age} yaşında)\n`;
      answer += `• **Mevcut Kilometre:** ${km.toLocaleString('tr-TR')} km\n`;
      answer += `• **Yıllık Ortalama Kullanım:** ~${avgPerYear.toLocaleString('tr-TR')} km/yıl\n\n`;

      if (avgPerYear > 25000) {
        answer += `ℹ️ Yıllık ortalama kullanım Türkiye standartlarına (~15.000-20.000 km) göre yüksek seviyededir. Motor, şanzıman ve yürüyen aksam yıpranması titizlikle incelenmelidir.\n`;
      } else if (avgPerYear < 10000) {
        answer += `✓ Yıllık ortalama kullanım seviyesi düşüktür. Kilometre orijinalliği için muayene ve servis kayıtları doğrulanmalıdır.\n`;
      } else {
        answer += `✓ Yıllık kullanım oranı yaşa göre dengeli ve standart seviyededir.\n`;
      }
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 5. Default Initial Evaluation (For Initial Analysis or General Requests)
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
