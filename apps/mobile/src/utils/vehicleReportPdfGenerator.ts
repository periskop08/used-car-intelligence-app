import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ComprehensiveVehicleReport,
  formatCanonicalPowerDisplay,
  formatCleanTransmissionName,
  calculateVehicleMtv,
  resolveVehicleRangeKm,
} from '@used-car-intelligence/shared';

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const formatFuelTypeTr = (fuel?: string): string => {
  if (!fuel) return 'Benzin';
  const u = fuel.trim().toUpperCase();
  if (u === 'PETROL' || u === 'BENZIN') return 'Benzin';
  if (u === 'DIESEL' || u === 'DIZEL') return 'Dizel';
  if (u === 'HYBRID' || u === 'PLUG_IN_HYBRID' || u === 'HIBRIT') return 'Hibrit';
  if (u === 'ELECTRIC' || u === 'ELEKTRIK') return 'Elektrik';
  if (u === 'LPG') return 'LPG & Benzin';
  return fuel;
};

export function buildVehicleReportHtml(report: ComprehensiveVehicleReport): string {
  const vi = report.vehicleIdentity || ({} as any);
  const synth = report.expertDecisionSynthesis || ({} as any);
  const specs = synth.technicalSpecifications || report.performanceUsage || ({} as any);
  const char = synth.vehicleCharacter || ({} as any);
  const trimEval = synth.trimEvaluation || ({} as any);
  const chronicList = synth.chronicIssues || (report as any).reliabilityIssues || [];
  const checklist = synth.inspectionChecklist || (report as any).inspectionPriorities || [];
  const sellerQuestions = synth.sellerQuestions || (report as any).sellerQuestions || [];

  const rawPower = specs.enginePowerHp ?? specs.powerHp ?? (vi as any).powerHp ?? vi.enginePowerHp ?? 0;
  const powerUnit = specs.sourcePowerUnit ?? vi.sourcePowerUnit ?? 'HP';
  const powerLabel = rawPower ? formatCanonicalPowerDisplay(rawPower, powerUnit) : '—';

  const rawTorque = specs.engineTorqueNm ?? specs.torqueNm ?? vi.engineTorqueNm;
  const torqueLabel = rawTorque ? `${rawTorque} Nm` : '—';

  const isEv = formatFuelTypeTr(vi.fuelType) === 'Elektrik';
  const rawDisplacement = specs.engineDisplacementCc ?? vi.engineDisplacementCc;
  const displacementLabel = isEv ? 'Elektrik' : (rawDisplacement ? `${rawDisplacement} cc` : '—');

  const topSpeed = specs.topSpeedKmh ? `${specs.topSpeedKmh} km/h` : '—';
  const zeroHundred = (specs.zeroToHundredSec ?? specs.zeroToHundredKmh) ? `${specs.zeroToHundredSec ?? specs.zeroToHundredKmh} sn` : '—';
  
  const electricRange = resolveVehicleRangeKm(report);
  const consumption = isEv
    ? (electricRange ? `${electricRange} km (Menzil)` : '—')
    : (specs.combinedFuelL100km ? `${specs.combinedFuelL100km} lt / 100km` : '—');

  const trunk = (specs.trunkCapacityLiters ?? specs.luggageCapacityL) ? `${specs.trunkCapacityLiters ?? specs.luggageCapacityL} L` : '—';
  const weight = (specs.curbWeightKg ?? specs.weightKg) ? `${specs.curbWeightKg ?? specs.weightKg} kg` : '—';

  const resolvedType = ((vi as any).vehicleType || (report as any).vehicleType || '').toUpperCase();
  const isMotorcycle = resolvedType === 'MOTORCYCLE' || !!(report as any).isMotorcycle;

  const mtv = calculateVehicleMtv({
    modelYear: vi.modelYear,
    engineDisplacement: rawDisplacement,
    fuelType: vi.fuelType,
    horsepower: rawPower,
    vehicleType: resolvedType,
    isMotorcycle,
  });

  const score = synth.decisionScore?.score ?? (report as any).overallScore ?? 80;
  const scoreTier = synth.decisionScore?.scoreTier ?? (score >= 85 ? 'MÜKEMMEL' : score >= 70 ? 'İYİ' : 'DİKKAT');
  const shortVerdict = synth.decisionScore?.shortVerdict ?? 'Kontrolleri yapılarak değerlendirilebilir.';

  const yearStr = vi.modelYear ? `${vi.modelYear} ` : '';
  const brandStr = vi.brand || '';
  const modelStr = vi.model || '';
  const trimStr = (vi as any).trim || vi.trimName || '';
  const fullTitle = `${yearStr}${brandStr} ${modelStr} ${trimStr}`.trim();

  const reportDate = report.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('tr-TR');

  const reportId = (report as any).reportId || (report as any).id || 'TS-RAPOR';

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TorqueScout Araç Raporu - ${escapeHtml(fullTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 11pt;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-logo-text {
      font-size: 20pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-logo-text span {
      color: #2563eb;
    }
    .report-meta-box {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
    }
    .report-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .vehicle-hero {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .vehicle-hero h1 {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .vehicle-hero-sub {
      font-size: 9.5pt;
      color: #475569;
      font-weight: 500;
    }
    .score-card {
      display: flex;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
      gap: 16px;
    }
    .score-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 68px;
      height: 68px;
      background: #1e293b;
      border: 3px solid #2563eb;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .score-number {
      font-size: 20pt;
      font-weight: 900;
      line-height: 1;
      color: #38bdf8;
    }
    .score-max {
      font-size: 7.5pt;
      color: #94a3b8;
    }
    .score-info {
      flex: 1;
    }
    .score-tier-badge {
      display: inline-block;
      background: rgba(37, 99, 235, 0.3);
      color: #60a5fa;
      border: 1px solid rgba(96, 165, 250, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 8pt;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .score-verdict {
      font-size: 10pt;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1.35;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .spec-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .spec-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .spec-val {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
    }
    .spec-val.accent {
      color: #ea580c;
    }
    .section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-body {
      font-size: 9pt;
      color: #334155;
      line-height: 1.45;
    }
    .bullet-list {
      list-style: none;
      margin-top: 6px;
    }
    .bullet-list li {
      position: relative;
      padding-left: 14px;
      margin-bottom: 4px;
      font-size: 8.5pt;
      color: #334155;
    }
    .bullet-list li::before {
      content: "•";
      position: absolute;
      left: 2px;
      color: #2563eb;
      font-weight: 900;
    }
    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 6px;
    }
    .pro-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .con-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .col-header {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .pro-header { color: #166534; }
    .con-header { color: #991b1b; }
    .footer-note {
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 16px;
    }
  </style>
</head>
<body>

  <!-- Official Header -->
  <div class="header-bar">
    <div>
      <div class="brand-logo-text">Torque<span>Scout</span></div>
      <div style="font-size: 8pt; color: #64748b; font-weight: 600;">Otomotiv İstihbarat &amp; Karar Destek Raporu</div>
    </div>
    <div class="report-meta-box">
      <div class="report-badge">Resmi Ekspertiz &amp; Veri Raporu</div>
      <div><strong>Rapor No:</strong> ${escapeHtml(reportId)}</div>
      <div><strong>Tarih:</strong> ${escapeHtml(reportDate)}</div>
    </div>
  </div>

  <!-- Vehicle Identity -->
  <div class="vehicle-hero">
    <h1>${escapeHtml(fullTitle)}</h1>
    <div class="vehicle-hero-sub">
      ${escapeHtml(displacementLabel)} • ${escapeHtml(powerLabel)} (${escapeHtml(torqueLabel)}) • ${escapeHtml(formatCleanTransmissionName(vi.transmissionName))} • ${escapeHtml(formatFuelTypeTr(vi.fuelType))}
    </div>
  </div>

  <!-- Score Hero -->
  <div class="score-card">
    <div class="score-circle">
      <span class="score-number">${score}</span>
      <span class="score-max">/100</span>
    </div>
    <div class="score-info">
      <div class="score-tier-badge">${escapeHtml(scoreTier)}</div>
      <div class="score-verdict">${escapeHtml(shortVerdict)}</div>
    </div>
  </div>

  <!-- Technical Specs 8-Grid -->
  <div class="specs-grid">
    <div class="spec-item">
      <div class="spec-label">Motor Gücü</div>
      <div class="spec-val">${escapeHtml(powerLabel)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Motor Hacmi</div>
      <div class="spec-val">${escapeHtml(displacementLabel)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Yıllık MTV</div>
      <div class="spec-val accent">${escapeHtml(mtv ? mtv.displayAnnual : '—')}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Maksimum Hız</div>
      <div class="spec-val">${escapeHtml(topSpeed)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">0-100 Hızlanma</div>
      <div class="spec-val">${escapeHtml(zeroHundred)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Tüketim / Menzil</div>
      <div class="spec-val">${escapeHtml(consumption)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Bagaj Hacmi</div>
      <div class="spec-val">${escapeHtml(trunk)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Boş Ağırlık</div>
      <div class="spec-val">${escapeHtml(weight)}</div>
    </div>
  </div>

  <!-- Vehicle Character & Driving Dynamics -->
  ${(char.headline || char.detailedAssessment) ? `
  <div class="section-box">
    <div class="section-title">🧭 Araç Karakteri &amp; Sürüş Dinamikleri</div>
    <div class="section-body">
      ${char.headline ? `<p style="font-weight: 700; margin-bottom: 4px;">${escapeHtml(char.headline)}</p>` : ''}
      ${char.detailedAssessment ? `<p>${escapeHtml(char.detailedAssessment)}</p>` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Trim Evaluation -->
  ${(trimEval.narrativeAssessment || trimEval.contemporaryPros?.length || trimEval.contemporaryCons?.length) ? `
  <div class="section-box">
    <div class="section-title">📦 Donanım Paketi Değerlendirmesi ${trimEval.trimName ? `(${escapeHtml(trimEval.trimName)})` : ''}</div>
    ${trimEval.narrativeAssessment ? `<div class="section-body" style="margin-bottom: 6px;"><p>${escapeHtml(trimEval.narrativeAssessment)}</p></div>` : ''}
    <div class="two-col-grid">
      <div class="pro-box">
        <div class="col-header pro-header">✔ Günümüz Şartlarında Artıları</div>
        <ul class="bullet-list">
          ${(trimEval.contemporaryPros || []).map((p: string) => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>
      <div class="con-box">
        <div class="col-header con-header">✖ Dikkat Edilmesi Gerekenler</div>
        <ul class="bullet-list">
          ${(trimEval.contemporaryCons || []).map((c: string) => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Chronic Defects & Reliability -->
  ${chronicList && chronicList.length > 0 ? `
  <div class="section-box">
    <div class="section-title">⚠️ Kronik Risk &amp; Mekanik Dayanıklılık Taraması</div>
    <ul class="bullet-list">
      ${chronicList.slice(0, 5).map((item: any) => {
        const title = item.title || item.component || item.name || 'Risk Noktası';
        const desc = item.description || item.symptom || item.detail || '';
        return `<li><strong>${escapeHtml(title)}:</strong> ${escapeHtml(desc)}</li>`;
      }).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- Inspection Priorities -->
  ${checklist && checklist.length > 0 ? `
  <div class="section-box">
    <div class="section-title">🔍 Ekspertiz Öncelikli Kontrol Noktaları</div>
    <ul class="bullet-list">
      ${checklist.slice(0, 6).map((item: any) => {
        const point = typeof item === 'string' ? item : (item.point || item.title || item.component || '');
        const reason = item.reason || item.description || '';
        return `<li><strong>${escapeHtml(point)}</strong>${reason ? ` - ${escapeHtml(reason)}` : ''}</li>`;
      }).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- Seller Questions -->
  ${sellerQuestions && sellerQuestions.length > 0 ? `
  <div class="section-box">
    <div class="section-title">❓ Satıcıya Sorulması Gereken Kritik Sorular</div>
    <ul class="bullet-list">
      ${sellerQuestions.slice(0, 5).map((item: any) => {
        const q = typeof item === 'string' ? item : (item.question || item.title || '');
        const exp = item.expectedAnswer ? ` (Beklenen: ${item.expectedAnswer})` : '';
        return `<li><strong>${escapeHtml(q)}</strong>${escapeHtml(exp)}</li>`;
      }).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="footer-note">
    Bu rapor TorqueScout Otomotiv Zekası motoru tarafından üretici katalogları, servis bültenleri ve teknik veritabanları taranarak hazırlanmıştır. Ekspertiz yerine geçmez, nihai karar destek aracıdır.
  </div>

</body>
</html>
  `.trim();
}

/**
 * Generates and shares or saves a clean native PDF from vehicle report data.
 */
export async function exportVehicleReportPdf(report: ComprehensiveVehicleReport): Promise<void> {
  const html = buildVehicleReportHtml(report);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'TorqueScout Araç Raporunu Kaydet / Paylaş',
    });
  } else {
    await Print.printAsync({ uri });
  }
}
