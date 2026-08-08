/**
 * clean-lpg-data.js
 * 
 * Analyzes and cleans non-OEM "LPG & Benzin" entries from the dataset.
 * In Turkish secondhand listing wizards (like arabam.com), fuel types are duplicated 
 * under "LPG & Benzin" for almost all petrol cars due to aftermarket conversion choices.
 * 
 * This script identifies true factory OEM LPG models (e.g., Honda Civic Eco, 
 * Dacia ECO-G, Fiat Egea Eco, Renault Eco-G, Opel EcoFlex LPG) and converts 
 * non-OEM aftermarket LPG entries back to their canonical factory fuel type ("Benzin").
 * Afterwards, it deduplicates redundant listing wizard entries.
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../scratch/arabam_final.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Original total records: ${data.length}`);

// List of OEM Factory LPG brand/models/variants in Turkey
function isFactoryLPG(item) {
  const brand = (item.brand || '').toLowerCase();
  const model = (item.model || '').toLowerCase();
  const engine = (item.engine || '').toLowerCase();
  const trim = (item.trim || '').toLowerCase();
  const pathStr = (item.fullPath || '').toLowerCase();

  const combined = `${brand} ${model} ${engine} ${trim} ${pathStr}`;

  // 1. Honda Civic Eco (FB7, FC5, FE)
  if (brand.includes('honda') && model.includes('civic') && (combined.includes('eco') || combined.includes('lpg'))) {
    return true;
  }

  // 2. Dacia Eco-G / LPG (Duster, Sandero, Logan, Jogger)
  if (brand.includes('dacia') && (combined.includes('eco-g') || combined.includes('ecog') || combined.includes('lpg'))) {
    return true;
  }

  // 3. Fiat Eco / LPG (Egea 1.4 Fire Eco LPG, Linea, Fiorino, Punto)
  if (brand.includes('fiat') && (model.includes('egea') || model.includes('linea') || model.includes('fiorino') || model.includes('punto')) && (combined.includes('lpg') || combined.includes('eco'))) {
    return true;
  }

  // 4. Renault ECO-G (Clio 1.0 TCe Eco-G, Symbol 1.2/1.0 LPG)
  if (brand.includes('renault') && (combined.includes('eco-g') || combined.includes('ecog') || combined.includes('lpg'))) {
    return true;
  }

  // 5. Hyundai OEM LPG (i20, Accent Blue, Elantra Eco/LPG)
  if (brand.includes('hyundai') && (combined.includes('lpg') || combined.includes('eco'))) {
    return true;
  }

  // 6. Opel EcoFlex LPG (Astra J 1.4T LPG, Corsa LPG)
  if (brand.includes('opel') && combined.includes('ecoflex') && combined.includes('lpg')) {
    return true;
  }

  // 7. Ford Factory LPG (Focus 1.6 LPG, Fiesta LPG)
  if (brand.includes('ford') && combined.includes('lpg')) {
    return true;
  }

  return false;
}

let convertedToBenzin = 0;
let keptFactoryLPG = 0;

const updatedRecords = data.map(item => {
  const fuel = item.fuel || '';
  if (fuel.includes('LPG')) {
    if (isFactoryLPG(item)) {
      keptFactoryLPG++;
      return { ...item, fuel: 'LPG & Benzin (Fabrika Çıkışlı)' };
    } else {
      convertedToBenzin++;
      return { ...item, fuel: 'Benzin' };
    }
  }
  return item;
});

console.log(`Converted non-OEM LPG entries -> Benzin: ${convertedToBenzin}`);
console.log(`Kept Genuine Factory OEM LPG entries: ${keptFactoryLPG}`);

// Deduplicate identical taxonomy rows resulting from listing wizard duplication
const uniqueMap = new Map();
updatedRecords.forEach(item => {
  const key = `${item.brand}|${item.model}|${item.subModel}|${item.year}|${item.fuel}|${item.bodyType}|${item.engine}|${item.transmission}|${item.trim}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, item);
  }
});

const finalDeduplicated = Array.from(uniqueMap.values());

console.log(`Final unique clean records after deduplication: ${finalDeduplicated.length}`);
console.log(`Removed duplicate listing wizard records: ${data.length - finalDeduplicated.length}`);

// Save back to arabam_final.json
fs.writeFileSync(jsonPath, JSON.stringify(finalDeduplicated, null, 2));
console.log('Successfully updated arabam_final.json!');
