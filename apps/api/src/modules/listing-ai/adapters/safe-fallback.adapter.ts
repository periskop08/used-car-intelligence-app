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
    const bodyType = vehicle.bodyType || 'Kasa tipi belirtilmemiş';
    const currentYear = new Date().getFullYear();
    const age = Math.max(1, currentYear - (vehicle.year || currentYear));
    const km = vehicle.mileageKm || 0;
    const avgKmPerYear = Math.round(km / age);

    const msg = (userMessage || '').toLowerCase();

    // 1. QUESTION: City Use / Şehir içi kullanım
    if (msg.includes('şehir içi') || msg.includes('sehir ici') || msg.includes('şehirde') || msg.includes('trafik')) {
      let answer = `### 🏙️ Şehir İçi Kullanım ve Trafik Uyum Değerlendirmesi\n\n`;
      answer += `İlandaki **${brand} ${model} (${year})** aracı şehir içi kullanım kriterleri doğrultusunda incelenmiştir:\n\n`;

      answer += `• **1. Şanzıman Ergonomisi:** Araç **${transmission}** şanzımana sahiptir. `;
      if (transmission.toLowerCase().includes('manuel') || transmission.toLowerCase().includes('manual')) {
        answer += `Yoğun şehir içi ve dur-kalk trafikte manuel şanzıman, sürekli debriyaj ve vites kullanımı gerektirdiği için otomatik şanzımanlı araçlara kıyasla belirgin şekilde daha yorucu bir sürüş deneyimi sunar.\n`;
      } else {
        answer += `Otomatik şanzıman yoğun dur-kalk şehir trafiğinde yüksek sürüş konforu ve kolaylık sağlar.\n`;
      }

      answer += `• **2. Yakıt Yapısı ve Motor Uyumu:** Araç **${fuel}** yakıt türüne sahiptir. `;
      if (fuel.toLowerCase().includes('dizel')) {
        answer += `Dizel motorlar kısa mesafeli (5-10 km altı) şehir içi kullanımlarda motor çalışma sıcaklığına ulaşmakta zorlanabilir ve Dizel Partikül Filtresi (DPF) dolma riski taşıyabilir. Düzenli uzun yol yapılmayacaksa DPF durumu satıcıya sorulmalıdır.\n`;
      } else if (fuel.toLowerCase().includes('benzin') || fuel.toLowerCase().includes('petrol')) {
        answer += `Benzinli motorlar kısa mesafe şehir içi sürüşlerinde hızlı ısınarak optimum çalışma sıcaklığına çabuk ulaşır.\n`;
      } else {
        answer += `Yakıt sistemi şehir içi standart sürüş şartlarına uyumludur.\n`;
      }

      answer += `• **3. Kasa Boyutu ve Park Kolaylığı:** **${bodyType}** kasa yapısı ve ${mileage} seviyesi göz önüne alındığında, şehir içi dar sokaklarda manevra kabiliyeti ve park kolaylığı açısından günlük kullanıma uygundur.\n\n`;

      answer += `**Sonuç:** Yoğun trafikte sürüş alışkanlığınıza ve manuel/otomatik tercihinize bağlı olarak araç değerlendirilmelidir. Alım öncesi dur-kalk trafikte test sürüşü yapılması önerilir.`;
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 2. QUESTION: Major Risks / En büyük riskler
    if (msg.includes('risk') || msg.includes('tehlike') || msg.includes('dikkat edilecek')) {
      let answer = `### ⚠️ İlandaki Temel Riskler ve Kontrol Özeti\n\n`;
      answer += `İlandaki **${brand} ${model} (${year}) - ${mileage}** aracı için tespit edilen ana risk faktörleri:\n\n`;

      if (condition.heavyDamageDeclared) {
        answer += `🚨 **1. Ağır Hasar Kaydı Riski:** Satıcı beyanında aracın ağır hasarlı olduğu belirtilmiştir. Bu ilandaki **en kritik risk faktörüdür**. Bağımsız ekspertizde şasi, podye, airbag, direkler ve emniyet kemerleri detaylı taranmalıdır.\n`;
      } else {
        answer += `✓ **1. Ağır Hasar Kaydı:** İlanda ağır hasar beyanı bulunmamaktadır.\n`;
      }

      answer += `• **2. Kilometre / Yaş Yıpranma Riski:** Araç ${age} yaşında olup yıllık ortalama **~${avgKmPerYear.toLocaleString('tr-TR')} km** yol yapmıştır. `;
      if (avgKmPerYear > 25000) {
        answer += `Yıllık kullanım oranı yüksek segmenttedir; yürüyen aksam, süspansiyon ve aktarma elemanlarının aşınma durumu dikkatle incelenmelidir.\n`;
      } else {
        answer += `Yıllık kullanım oranı standart seviyelerdedir.\n`;
      }

      if (condition.paintedParts?.length > 0 || condition.changedParts?.length > 0) {
        answer += `• **3. Kaporta & Boya Beyanları:** `;
        if (condition.paintedParts?.length > 0) answer += `Boyalı parçalar: ${condition.paintedParts.join(', ')}. `;
        if (condition.changedParts?.length > 0) answer += `Değişen parçalar: ${condition.changedParts.join(', ')}. `;
        answer += `\n`;
      }

      if (missing.length > 0) {
        answer += `⚠️ **4. İlandaki Eksik Bilgi Riski:** İlanda **${missing.join(', ')}** alanları boş bırakılmıştır. Satıcıdan detay istenmelidir.\n`;
      }

      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 3. QUESTION: Questions for Seller / Satıcıya sorular
    if (msg.includes('satıcıya') || msg.includes('sormalı') || msg.includes('soru')) {
      let answer = `### 📋 Satıcıya Sorulması Gereken Öncelikli Sorular\n\n`;
      answer += `1. **Bakım & Servis Kayıtları:** Aracın periyodik bakım geçmişi tam mı ve servis faturaları mevcut mu?\n`;
      answer += `2. **Tramer & Hasar Belgesi:** Hasar kaydı sorgulama ekran görüntüsü ve mevcut ekspertiz raporu paylaşılabilir mi?\n`;
      answer += `3. **Muayene & Lastik Durumu:** Fenni muayene bitiş tarihi ve lastiklerin üretim yılı/diş derinliği nedir?\n`;
      if (missing.length > 0) {
        answer += `4. **Eksik İlan Alanları:** İlanda belirtilmeyen **${missing.join(', ')}** detayları nelerdir?\n`;
      } else {
        answer += `4. **Yedek Anahtar:** Yedek anahtarı ve orijinal kullanım kitapçıkları duruyor mu?\n`;
      }
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 4. QUESTION: Mileage vs Age / Kilometre ve Yaş
    if (msg.includes('kilometre') || msg.includes('km') || msg.includes('yaş')) {
      let answer = `### 📊 Kilometre ve Yaş Dengesi Analizi\n\n`;
      answer += `• **Model Yılı & Yaş:** ${year} (${age} yaşında)\n`;
      answer += `• **Mevcut Kilometre:** ${mileage}\n`;
      answer += `• **Yıllık Ortalama Sürüş:** ~${avgKmPerYear.toLocaleString('tr-TR')} km/yıl\n\n`;

      if (avgKmPerYear > 25000) {
        answer += `ℹ️ Yıllık ortalama sürüş Türkiye ortalamasına (~15.000-20.000 km) kıyasla yüksek seviyededir. Yürüyen aksam ve motor kondisyonu ekspertizde doğrulanmalıdır.\n`;
      } else if (avgKmPerYear < 10000) {
        answer += `✓ Yıllık sürüş mesafesi oldukça düşüktür. Kilometre orijinalliği açısından TÜVTÜRK muayene kayıtları ve servis geçmişi kontrol ettirilmelidir.\n`;
      } else {
        answer += `✓ Kilometre ve yaş dengesi Türkiye standartlarına uygun, dengeli bir profile sahiptir.\n`;
      }
      return { answer, providerName: this.providerName, tokenCount: 0 };
    }

    // 5. DEFAULT COMPREHENSIVE INITIAL ANALYSIS (For "Bu İlanı AI ile Değerlendir" or General Queries)
    let answer = `### 🚗 İlan Genel Değerlendirmesi\n\n`;
    answer += `İlandaki **${brand} ${model} (${year})** aracı teknik veriler, satıcı beyanları ve piyasa standartları ışığında analiz edilmiştir:\n\n`;

    answer += `**Temel Veriler:**\n`;
    answer += `• **Araç:** ${brand} ${model} (${year})\n`;
    answer += `• **Fiyat & Kilometre:** ${price} | ${mileage}\n`;
    answer += `• **Yakıt & Şanzıman:** ${fuel} | ${transmission}\n`;
    answer += `• **Kasa Tipi:** ${bodyType}\n\n`;

    answer += `**📊 Kaporta & Hasar Beyanı:**\n`;
    if (condition.heavyDamageDeclared) {
      answer += `⚠️ **Ağır Hasar Kaydı:** Satıcı ilanda aracın ağır hasarlı olduğunu beyan etmiştir. Şasi, direk ve airbag kontrolleri zorunludur.\n\n`;
    } else {
      answer += `✓ İlanda ağır hasar beyanı bulunmamaktadır.\n\n`;
    }

    if (condition.paintedParts?.length > 0 || condition.changedParts?.length > 0) {
      answer += `**Kaporta Beyan Detayları:**\n`;
      if (condition.paintedParts?.length > 0) answer += `• Boyalı parçalar: ${condition.paintedParts.join(', ')}\n`;
      if (condition.changedParts?.length > 0) answer += `• Değişen parçalar: ${condition.changedParts.join(', ')}\n`;
      answer += `\n`;
    }

    if (missing.length > 0) {
      answer += `**⚠️ İlandaki Eksik Veriler:** İlanda **${missing.join(', ')}** alanları boş bırakılmıştır.\n\n`;
    }

    answer += `**📋 Satıcıya Sorulacak Sorular:**\n`;
    answer += `1. Periyodik bakım geçmişi ve servis kayıtları mevcut mu?\n`;
    answer += `2. Tramer sorgu ekran görüntüsü paylaşılabilir mi?\n`;
    answer += `3. Fenni muayene bitiş tarihi nedir?\n\n`;
    answer += `*Bu değerlendirme ilan sahibinin beyanları üzerinden hazırlanmıştır. Alım öncesi bağımsız ekspertiz kontrolü önerilir.*`;

    return {
      answer,
      providerName: this.providerName,
      tokenCount: 0,
    };
  }
}
