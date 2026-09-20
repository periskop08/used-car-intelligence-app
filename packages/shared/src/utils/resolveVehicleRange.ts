/**
 * Resolves verified or catalog WLTP electric range (km) for electric vehicles.
 */
export function resolveVehicleRangeKm(report: any): number | null {
  if (!report) return null;

  // 1. Check direct verified range in performanceUsage or technicalSpecifications
  const rawRange = 
    report.performanceUsage?.electricRangeWltpKm
    ?? (report.expertDecisionSynthesis as any)?.technicalSpecifications?.electricRangeWltpKm
    ?? (report as any)?.technicalSpecifications?.electricRangeWltpKm
    ?? report.performanceUsage?.rangeKm
    ?? report.performanceUsage?.estimatedRangeKm
    ?? (report.performanceUsage as any)?.electricRangeKm;

  if (typeof rawRange === 'number' && rawRange > 0) return Math.round(rawRange);
  if (typeof rawRange === 'string') {
    const parsed = parseInt(rawRange.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 2. Check if fuel is Electric
  const fuel = (report.vehicleIdentity?.fuelType || '').toLowerCase();
  const isEv = fuel.includes('elektrik') || fuel.includes('electric') || fuel.includes('bev');
  if (!isEv) return null;

  // 3. Fallback catalog resolution for known Turkish/European market EV models
  const brand = (report.vehicleIdentity?.brand || '').toLowerCase();
  const model = (report.vehicleIdentity?.model || '').toLowerCase();
  const trim = (report.vehicleIdentity?.trimName || (report.vehicleIdentity as any)?.trim || '').toLowerCase();
  const engine = (report.vehicleIdentity?.engineCode || '').toLowerCase();

  // Togg
  if (brand.includes('togg')) {
    if (model.includes('t10f')) {
      return trim.includes('uzun') ? 600 : 350;
    }
    if (model.includes('t10x')) {
      return trim.includes('uzun') || trim.includes('v2') ? 523 : 314;
    }
  }

  // Tesla
  if (brand.includes('tesla')) {
    if (model.includes('model y')) {
      if (trim.includes('performance') || engine.includes('performance')) return 514;
      if (trim.includes('long range') || trim.includes('uzun') || trim.includes('lr')) return 533;
      return 455;
    }
    if (model.includes('model 3')) {
      if (trim.includes('long range') || trim.includes('uzun') || trim.includes('lr')) return 629;
      return 513;
    }
  }

  // Renault
  if (brand.includes('renault')) {
    if (model.includes('megane')) {
      return (trim.includes('60') || engine.includes('160') || engine.includes('220')) ? 450 : 300;
    }
    if (model.includes('zoe')) return 395;
    if (model.includes('r5')) return 400;
  }

  // BYD
  if (brand.includes('byd')) {
    if (model.includes('atto 3')) return 420;
    if (model.includes('seal')) return 570;
    if (model.includes('dolphin')) return 427;
  }

  // Hyundai / Kia
  if (brand.includes('hyundai')) {
    if (model.includes('ioniq 5')) return 481;
    if (model.includes('ioniq 6')) return 614;
    if (model.includes('kona')) return 484;
  }
  if (brand.includes('kia')) {
    if (model.includes('ev6')) return 528;
    if (model.includes('ev9')) return 563;
    if (model.includes('niro')) return 460;
  }

  // Stellantis (Peugeot, Opel, Citroen)
  if (brand.includes('peugeot')) {
    if (model.includes('2008')) return 406;
    if (model.includes('208')) return 400;
    if (model.includes('308')) return 410;
  }
  if (brand.includes('opel')) {
    if (model.includes('corsa')) return 402;
    if (model.includes('mokka')) return 338;
    if (model.includes('astra')) return 416;
  }
  if (brand.includes('citroen')) {
    if (model.includes('c4')) return 357;
    if (model.includes('c3')) return 320;
  }

  // Volvo
  if (brand.includes('volvo')) {
    if (model.includes('ex30')) return trim.includes('plus') || trim.includes('ultra') ? 476 : 344;
    if (model.includes('xc40') || model.includes('ex40')) return 573;
  }

  // MG
  if (brand.includes('mg')) {
    if (model.includes('mg4')) return 450;
    if (model.includes('zs')) return 440;
  }

  return null;
}
