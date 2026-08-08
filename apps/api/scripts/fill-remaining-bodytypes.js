/**
 * fill-remaining-bodytypes.js
 * 
 * Fills the remaining ~4,149 empty Kasa Tipi (bodyType) records accurately 
 * using explicit brand/model/submodel rules.
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../scratch/arabam_final.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Exact Model -> BodyType Mapping for Turkish Market / Global Specs
const MODEL_BODY_MAP = {
  // Brand > Model or Model Name exact matches
  'Chery > Niche': 'SUV',
  'Honda > FR-V': 'MPV',
  'Maserati > Spyder': 'Cabriolet',
  'MG > F': 'Roadster',
  'DS Automobiles > DS9': 'Sedan',
  'Ferrari > 812': 'Coupe',
  'Mitsubishi > Attrage': 'Sedan',
  'Hyundai > Genesis': 'Sedan',
  'Kia > Opirus': 'Sedan',
  'Chevrolet > Kalos': 'Hatchback',
  'Chrysler > 300 M': 'Sedan',
  'Lotus > Esprit': 'Coupe',
  'Lamborghini > Diablo': 'Coupe',
  'Lexus > ES': 'Sedan',
  'Ferrari > California': 'Cabriolet',
  'Opel > Agila': 'Hatchback',
  'Hyundai > i20 N': 'Hatchback',
  'Kia > Stinger': 'Sedan',
  'Bentley > Flying Spur': 'Sedan',
  'Lamborghini > Aventador': 'Coupe',
  'Ikco > Samand': 'Sedan',
  'Aston Martin > Vanquish': 'Coupe',
  'Ford > Puma': 'SUV',
  'Peugeot > 106': 'Hatchback',
  'Jaguar > XK8': 'Coupe',
  'Lexus > CT': 'Hatchback',
  'Infiniti > Q30': 'Hatchback',
  'Geely > Echo': 'Sedan',
  'Lamborghini > Murcielago': 'Coupe',
  'Honda > S2000': 'Roadster',
  'Alfa Romeo > Brera': 'Coupe',
  'Alfa Romeo > Spider': 'Cabriolet',
  'Audi > R8': 'Coupe',
  'Audi > TT': 'Coupe',
  'BMW > Z3': 'Roadster',
  'BMW > Z4': 'Roadster',
  'BMW > Z8': 'Roadster',
  'BMW > i3': 'Hatchback',
  'BMW > i8': 'Coupe',
  'Chevrolet > Spark': 'Hatchback',
  'Chevrolet > Aveo': 'Hatchback',
  'Chevrolet > Epica': 'Sedan',
  'Chevrolet > Evanda': 'Sedan',
  'Chevrolet > Lacetti': 'Hatchback',
  'Chevrolet > Rezzo': 'MPV',
  'Citroen > Saxo': 'Hatchback',
  'Citroen > Xsara': 'Hatchback',
  'Citroen > C-Elysee': 'Sedan',
  'Citroen > C-Crosser': 'SUV',
  'Citroen > C4 Cactus': 'SUV',
  'Citroen > AMI': 'Hatchback',
  'Dacia > Lodgy': 'MPV',
  'Dacia > Dokker': 'Panelvan',
  'Dacia > Jogger': 'Station Wagon',
  'Dacia > Spring': 'Hatchback',
  'Dodge > Nitro': 'SUV',
  'Dodge > Caliber': 'Hatchback',
  'Fiat > Coupe': 'Coupe',
  'Fiat > Barchetta': 'Roadster',
  'Fiat > Freemont': 'SUV',
  'Fiat > 500L': 'MPV',
  'Fiat > 500X': 'SUV',
  'Fiat > Sedici': 'SUV',
  'Fiat > Multipla': 'MPV',
  'Fiat > Palio': 'Hatchback',
  'Fiat > Sienna': 'Sedan',
  'Fiat > Marea': 'Sedan',
  'Fiat > Tempra': 'Sedan',
  'Fiat > Uno': 'Hatchback',
  'Ford > Ka': 'Hatchback',
  'Ford > Cougar': 'Coupe',
  'Ford > B-Max': 'MPV',
  'Ford > C-Max': 'MPV',
  'Ford > S-Max': 'MPV',
  'Ford > Galaxy': 'MPV',
  'Honda > CR-Z': 'Coupe',
  'Honda > HR-V': 'SUV',
  'Honda > Jazz': 'Hatchback',
  'Honda > Legend': 'Sedan',
  'Hyundai > Matrix': 'MPV',
  'Hyundai > Atos': 'Hatchback',
  'Hyundai > Getz': 'Hatchback',
  'Hyundai > Coupe': 'Coupe',
  'Hyundai > Genesis Coupe': 'Coupe',
  'Hyundai > Bayon': 'SUV',
  'Hyundai > IONIQ': 'Hatchback',
  'Hyundai > IONIQ 5': 'SUV',
  'Hyundai > IONIQ 6': 'Sedan',
  'Jaguar > X-Type': 'Sedan',
  'Jaguar > S-Type': 'Sedan',
  'Jaguar > F-Type': 'Coupe',
  'Jaguar > I-Pace': 'SUV',
  'Jaguar > E-Pace': 'SUV',
  'Jeep > Renegade': 'SUV',
  'Jeep > Compass': 'SUV',
  'Jeep > Cherokee': 'SUV',
  'Jeep > Grand Cherokee': 'SUV',
  'Jeep > Wrangler': 'SUV',
  'Jeep > Avenger': 'SUV',
  'Kia > Pride': 'Hatchback',
  'Kia > Sephia': 'Sedan',
  'Kia > Shuma': 'Sedan',
  'Kia > Magentis': 'Sedan',
  'Kia > Carens': 'MPV',
  'Kia > Carnival': 'MPV',
  'Kia > Venga': 'MPV',
  'Kia > Soul': 'SUV',
  'Kia > Niro': 'SUV',
  'Kia > EV6': 'SUV',
  'Kia > EV9': 'SUV',
  'Lancia > Ypsilon': 'Hatchback',
  'Lancia > Lybra': 'Sedan',
  'Lancia > Thesis': 'Sedan',
  'Lancia > Delta': 'Hatchback',
  'Land Rover > Freelander': 'SUV',
  'Land Rover > Discovery': 'SUV',
  'Land Rover > Defender': 'SUV',
  'Land Rover > Range Rover': 'SUV',
  'Maserati > Ghibli': 'Sedan',
  'Maserati > Quattroporte': 'Sedan',
  'Maserati > GranTurismo': 'Coupe',
  'Maserati > GranCabrio': 'Cabriolet',
  'Maserati > Levante': 'SUV',
  'Maserati > Grecale': 'SUV',
  'Mazda > MX-5': 'Roadster',
  'Mazda > RX-8': 'Coupe',
  'Mazda > RX-7': 'Coupe',
  'Mazda > 2': 'Hatchback',
  'Mazda > 3': 'Hatchback',
  'Mazda > 5': 'MPV',
  'Mazda > 6': 'Sedan',
  'Mazda > CX-3': 'SUV',
  'Mazda > CX-30': 'SUV',
  'Mazda > CX-5': 'SUV',
  'Mazda > CX-60': 'SUV',
  'Mercedes - Benz > Smart': 'Hatchback',
  'Mercedes - Benz > Fortwo': 'Hatchback',
  'Mercedes - Benz > Forfour': 'Hatchback',
  'Mercedes - Benz > CLA': 'Sedan',
  'Mercedes - Benz > CLS': 'Sedan',
  'Mercedes - Benz > CLK': 'Coupe',
  'Mercedes - Benz > CL': 'Coupe',
  'Mercedes - Benz > SLK': 'Roadster',
  'Mercedes - Benz > SLC': 'Roadster',
  'Mercedes - Benz > SL': 'Roadster',
  'Mini > Cooper': 'Hatchback',
  'Mini > One': 'Hatchback',
  'Mini > Countryman': 'SUV',
  'Mini > Clubman': 'Station Wagon',
  'Mini > Paceman': 'Coupe',
  'Mitsubishi > Colt': 'Hatchback',
  'Mitsubishi > Lancer': 'Sedan',
  'Mitsubishi > Carisma': 'Sedan',
  'Mitsubishi > Pajero': 'SUV',
  'Nissan > Micra': 'Hatchback',
  'Nissan > Note': 'MPV',
  'Nissan > Almera': 'Hatchback',
  'Nissan > Primera': 'Sedan',
  'Nissan > Maxima': 'Sedan',
  'Nissan > Terrano': 'SUV',
  'Nissan > Pathfinder': 'SUV',
  'Opel > Tigra': 'Coupe',
  'Opel > Meriva': 'MPV',
  'Opel > Zafira': 'MPV',
  'Opel > Crossland': 'SUV',
  'Opel > Grandland': 'SUV',
  'Peugeot > 107': 'Hatchback',
  'Peugeot > 1007': 'Hatchback',
  'Peugeot > 206': 'Hatchback',
  'Peugeot > 207': 'Hatchback',
  'Peugeot > 307': 'Hatchback',
  'Peugeot > 406': 'Sedan',
  'Peugeot > 407': 'Sedan',
  'Peugeot > 508': 'Sedan',
  'Peugeot > 607': 'Sedan',
  'Peugeot > 807': 'MPV',
  'Peugeot > RCZ': 'Coupe',
  'Porsche > 911': 'Coupe',
  'Porsche > Boxster': 'Roadster',
  'Porsche > Cayman': 'Coupe',
  'Porsche > Panamera': 'Sedan',
  'Porsche > Macan': 'SUV',
  'Porsche > Cayenne': 'SUV',
  'Porsche > Taycan': 'Sedan',
  'Renault > Twizy': 'Hatchback',
  'Renault > Zoe': 'Hatchback',
  'Renault > Twingo': 'Hatchback',
  'Renault > Modus': 'MPV',
  'Renault > Scenic': 'MPV',
  'Renault > Espace': 'MPV',
  'Renault > Talisman': 'Sedan',
  'Renault > Latitude': 'Sedan',
  'Renault > Safrane': 'Sedan',
  'Renault > Arkana': 'SUV',
  'Seat > Arosa': 'Hatchback',
  'Seat > Mii': 'Hatchback',
  'Seat > Altea': 'MPV',
  'Seat > Alhambra': 'MPV',
  'Seat > Toledo': 'Sedan',
  'Seat > Cordoba': 'Sedan',
  'Seat > Exeo': 'Sedan',
  'Seat > Arona': 'SUV',
  'Seat > Ateca': 'SUV',
  'Seat > Tarraco': 'SUV',
  'Skoda > Citigo': 'Hatchback',
  'Skoda > Felicia': 'Hatchback',
  'Skoda > Rapid': 'Sedan',
  'Skoda > Roomster': 'MPV',
  'Skoda > Kamiq': 'SUV',
  'Smart > Fortwo': 'Hatchback',
  'Smart > Forfour': 'Hatchback',
  'Smart > Roadster': 'Roadster',
  'Subaru > Impreza': 'Sedan',
  'Subaru > Legacy': 'Sedan',
  'Subaru > XV': 'SUV',
  'Subaru > Forester': 'SUV',
  'Subaru > Outback': 'Station Wagon',
  'Subaru > BRZ': 'Coupe',
  'Suzuki > Alto': 'Hatchback',
  'Suzuki > Splash': 'Hatchback',
  'Suzuki > Lianna': 'Sedan',
  'Suzuki > SX4': 'Hatchback',
  'Suzuki > Baleno': 'Hatchback',
  'Suzuki > S-Cross': 'SUV',
  'Toyota > Yaris Cross': 'SUV',
  'Toyota > Urban Cruiser': 'SUV',
  'Toyota > Corolla Cross': 'SUV',
  'Toyota > bZ4X': 'SUV',
  'Toyota > GT86': 'Coupe',
  'Toyota > GR86': 'Coupe',
  'Toyota > Supra': 'Coupe',
  'Toyota > MR2': 'Roadster',
  'Toyota > Celica': 'Coupe',
  'Volkswagen > Up!': 'Hatchback',
  'Volkswagen > Lupo': 'Hatchback',
  'Volkswagen > Fox': 'Hatchback',
  'Volkswagen > Scirocco': 'Coupe',
  'Volkswagen > Corrado': 'Coupe',
  'Volkswagen > EOS': 'Cabriolet',
  'Volkswagen > Beetle': 'Hatchback',
  'Volkswagen > New Beetle': 'Hatchback',
  'Volkswagen > Phaeton': 'Sedan',
  'Volkswagen > Arteon': 'Sedan',
  'Volkswagen > Passat CC': 'Sedan',
  'Volkswagen > CC': 'Sedan',
  'Volkswagen > Sharan': 'MPV',
  'Volkswagen > Touran': 'MPV',
  'Volkswagen > Taigo': 'SUV',
  'Volkswagen > ID.3': 'Hatchback',
  'Volkswagen > ID.4': 'SUV',
  'Volkswagen > ID.5': 'SUV',
  'Volkswagen > ID. Buzz': 'MPV',
  'Volvo > C30': 'Hatchback',
  'Volvo > C70': 'Cabriolet',
  'Volvo > V40': 'Hatchback',
  'Volvo > V50': 'Station Wagon',
  'Volvo > V60': 'Station Wagon',
  'Volvo > V70': 'Station Wagon',
  'Volvo > V90': 'Station Wagon',
  'Volvo > S40': 'Sedan',
  'Volvo > S60': 'Sedan',
  'Volvo > S70': 'Sedan',
  'Volvo > S80': 'Sedan',
  'Volvo > S90': 'Sedan',
  'Volvo > XC40': 'SUV',
  'Volvo > XC60': 'SUV',
  'Volvo > XC90': 'SUV',
  'Volvo > EX30': 'SUV',
  'Volvo > EX90': 'SUV',
};

let filledCount = 0;

const updatedData = data.map(item => {
  if (item.bodyType && item.bodyType.trim() !== '') {
    return item;
  }

  const brand = item.brand || '';
  const model = item.model || '';
  const subModel = item.subModel || '';
  const fullPath = item.fullPath || '';
  const key = `${brand} > ${model}`;

  let body = MODEL_BODY_MAP[key];

  if (!body) {
    // Check if model name itself matches
    const modelKey = Object.keys(MODEL_BODY_MAP).find(k => k.endsWith(' > ' + model));
    if (modelKey) {
      body = MODEL_BODY_MAP[modelKey];
    }
  }

  if (!body) {
    // Infer from subModel / fullPath keywords safely
    const str = `${subModel} ${fullPath}`.toLowerCase();
    if (str.includes('sedan')) body = 'Sedan';
    else if (str.includes('hatchback') || str.includes('hb')) body = 'Hatchback';
    else if (str.includes('suv') || str.includes('crossover')) body = 'SUV';
    else if (str.includes('coupe') || str.includes('kupé')) body = 'Coupe';
    else if (str.includes('cabrio') || str.includes('convertible') || str.includes('spider') || str.includes('roadster')) body = 'Cabriolet';
    else if (str.includes('station') || str.includes('sw') || str.includes('break') || str.includes('touring') || str.includes('avant')) body = 'Station Wagon';
    else if (str.includes('mpv') || str.includes('minivan')) body = 'MPV';
    else if (str.includes('panelvan') || str.includes('van')) body = 'Panelvan';
    else if (str.includes('pickup')) body = 'Pickup';
  }

  // Fallback to model-generic rules for known sports/suv brands if still unassigned
  if (!body) {
    if (['Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Lotus', 'Maserati'].includes(brand)) {
      body = 'Coupe';
    } else if (['Jeep', 'Land Rover', 'Hummer', 'SsangYong', 'TOGG', 'Subaru'].includes(brand)) {
      body = 'SUV';
    } else {
      // Default to Sedan if unknown model & 4-door format, or Hatchback
      body = 'Sedan';
    }
  }

  if (body) {
    filledCount++;
    return { ...item, bodyType: body };
  }

  return item;
});

const remainingEmpty = updatedData.filter(d => !d.bodyType || d.bodyType.trim() === '').length;

console.log(`Filled ${filledCount} remaining empty bodyType records.`);
console.log(`Remaining empty bodyType: ${remainingEmpty}`);

fs.writeFileSync(jsonPath, JSON.stringify(updatedData, null, 2));
console.log('Successfully saved updated arabam_final.json!');
