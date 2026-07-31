const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

let isPaused = false;
let browser = null;

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Pause check helper
async function checkPause() {
  if (isPaused) {
    console.log("⏸️  Tarama duraklatıldı. Devam etmek için terminalde 'r' tuşuna basın.");
    while (isPaused) {
      await sleep(1000);
    }
    console.log("▶️  Tarama devam ediyor...");
  }
}

// Check if page is currently stuck on Cloudflare Turnstile/Challenge
async function checkIfBlocked(page) {
  return await page.evaluate(() => {
    const title = document.title || '';
    const bodyText = document.body ? document.body.textContent || '' : '';
    return title.includes('İnsan olduğunuz doğrulanıyor') || 
           title.includes('Attention Required') || 
           bodyText.includes('İnsan olduğunuz doğrulanıyor') ||
           bodyText.includes('Cloudflare');
  });
}

// Click an item in a column using native Puppeteer mouse events and wait for confirmation with retries
async function selectItemInColumn(page, colIndex, targetText, columnNameForLog = "", maxRetries = 3) {
  await checkPause();
  
  if (columnNameForLog) {
    console.log(`    [SEÇİLİYOR] ${columnNameForLog}: ${targetText}`);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let blocked = await checkIfBlocked(page);
    if (blocked) {
      console.log("\n⚠️ [BLOCKED] Cloudflare algılandı. Lütfen Chrome'da doğrulamayı çözün.");
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      await askQuestion("Doğrulandı mı? Devam etmek için ENTER'a basın...");
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
    }

    const elementHandle = await page.evaluateHandle((colIndex, targetText) => {
      const cols = Array.from(document.querySelectorAll('.category-step-container'));
      if (!cols[colIndex]) return null;
      
      const items = Array.from(cols[colIndex].querySelectorAll('ul.category-items li'));
      const targetItem = items.find(item => {
        const title = item.querySelector('.title') || item;
        return title.textContent.trim() === targetText;
      });
      
      if (targetItem) {
        return targetItem.querySelector('.title') || targetItem;
      }
      return null;
    }, colIndex, targetText);

    const isElement = elementHandle.asElement();
    if (isElement) {
      try {
        await isElement.scrollIntoView();
        await sleep(350);
        await isElement.click();
      } catch (err) {
        console.log(`    ⚠️ Tıklama denemesi ${attempt}/${maxRetries} ("${targetText}"): ${err.message}`);
      }

      let updated = false;
      for (let i = 0; i < 35; i++) { // Max 7 seconds timeout per attempt
        await sleep(200);
        const isSelected = await page.evaluate((colIndex, targetText) => {
          const cols = Array.from(document.querySelectorAll('.category-step-container'));
          if (!cols[colIndex]) return false;
          const selectedItem = cols[colIndex].querySelector('li.selected');
          if (!selectedItem) return false;
          const title = selectedItem.querySelector('.title') || selectedItem;
          return title.textContent.trim() === targetText;
        }, colIndex, targetText);
        
        if (isSelected) {
          updated = true;
          break;
        }
      }

      if (updated) {
        await sleep(1000);
        return true;
      }
    }

    if (attempt < maxRetries) {
      console.log(`    🔄 Tıklama uyuşmadı ("${targetText}"), ${attempt}/${maxRetries}. deneme yapılıyor...`);
      await sleep(1200);
    }
  }

  return false;
}

// Get all options in a column by index (de-duplicated)
async function getOptionsInColumn(page, colIndex) {
  await checkPause();
  return await page.evaluate((colIndex) => {
    const cols = Array.from(document.querySelectorAll('.category-step-container'));
    if (!cols[colIndex]) return [];
    
    const items = Array.from(cols[colIndex].querySelectorAll('ul.category-items li'));
    const unique = new Set();
    items.forEach(item => {
      const title = item.querySelector('.title') || item;
      const val = title.textContent.trim();
      if (val) unique.add(val);
    });
    return Array.from(unique);
  }, colIndex);
}

// Set up keypress listener for Pause/Resume
function setupKeypressListener() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', async (str, key) => {
    if (key.ctrl && key.name === 'c') {
      console.log("\n⚠️  CTRL+C algılandı. Tarayıcıyı açık bırakarak kapatılıyor...");
      if (browser && browser.isConnected()) {
        await browser.disconnect();
      }
      process.exit(0);
    } else if (key.name === 'p') {
      isPaused = true;
    } else if (key.name === 'r') {
      isPaused = false;
    }
  });
}

async function main() {
  console.log("==================================================");
  console.log("   ARABAM.COM WIZARD A-Z FULL TAXONOMY SCRAPER");
  console.log("==================================================");
  console.log("[İPUCU] İstediğiniz an taramayı duraklatmak için 'p' tuşuna,");
  console.log("devam ettirmek için 'r' tuşuna basabilirsiniz.");
  console.log("CTRL+C yaparsanız Chrome penceresi AÇIK kalacaktır.\n");

  const outputFilePath = path.join(__dirname, '../scratch/arabam_wizard_all.json');
  const progressFilePath = path.join(__dirname, '../scratch/arabam_wizard_progress.json');

  let allResults = [];
  let completedKeys = new Set();

  // Load existing data if files exist
  if (fs.existsSync(outputFilePath)) {
    try {
      const content = fs.readFileSync(outputFilePath, 'utf8');
      if (content.trim()) {
        allResults = JSON.parse(content);
        console.log(`ℹ️  Bulunan mevcut kayıtlar: ${allResults.length} adet.`);
      }
    } catch (e) {
      console.log("⚠️  Kayıt dosyası okunurken hata oluştu:", e.message);
    }
  }

  if (fs.existsSync(progressFilePath)) {
    try {
      const content = fs.readFileSync(progressFilePath, 'utf8');
      if (content.trim()) {
        const list = JSON.parse(content);
        completedKeys = new Set(list);
        console.log(`ℹ️  Daha önce tamamlanan [Yıl_Yakıt_Marka] kombinasyon sayısı: ${completedKeys.size}`);
      }
    } catch (e) {
      console.log("⚠️  İlerleme dosyası okunurken hata oluştu:", e.message);
    }
  }

  let resumeMode = false;
  if (completedKeys.size > 0) {
    const answer = await askQuestion("\nKaldığın yerden devam etmek (önceden taranan kombinasyonları atlamak) istiyor musun? (evet/hayır): ");
    if (answer.toLowerCase().startsWith('e') || answer.toLowerCase().startsWith('y')) {
      resumeMode = true;
      console.log("▶️  Kaldığı yerden devam etme modu etkin.");
    }
  }

  setupKeypressListener();

  console.log("\nLaunching local Chrome browser...");
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log("Navigating to https://www.arabam.com/ilan-ver/...");
  await page.goto("https://www.arabam.com/ilan-ver/", { waitUntil: 'domcontentloaded' });

  console.log("\n[TALİMATLAR]");
  console.log("1. Açılan tarayıcı penceresinde üye girişi yapın.");
  console.log("2. İlan Verme -> Araç Seçimi bölümüne gelin (ekranda sütunlar görünmeli).");
  console.log("3. Hazır olduğunuzda bu terminale dönün ve ENTER'a basın.");
  
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  await askQuestion("\nSayfa hazır olduğunda otomatik taramayı başlatmak için ENTER'a basın...");
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  console.log("\n🚀 Otomatik A-Z sihirbaz taraması başlatılıyor...");

  // Select "Otomobil" in Column 0
  const col0Options = await getOptionsInColumn(page, 0);
  if (!col0Options.includes("Otomobil")) {
    console.error("❌ Hata: Sütun 0'da 'Otomobil' seçeneği bulunamadı.");
    await browser.close();
    return;
  }
  await selectItemInColumn(page, 0, "Otomobil", "Kategori");

  // DFS function starting from model (colIndex >= 4)
  async function crawlModelDfs(colIndex, resultsArray) {
    await checkPause();
    let blocked = await checkIfBlocked(page);
    if (blocked) {
      console.log("\n⚠️ [BLOCKED] Cloudflare detected. Please solve Turnstile challenge in Chrome.");
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      await askQuestion("Solved? Press ENTER to resume...");
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
    }

    const options = await getOptionsInColumn(page, colIndex);
    if (options.length === 0) {
      return;
    }

    const logLabel = colIndex === 4 ? "Model" : 
                     colIndex === 5 ? "Kasa/Jenerasyon" :
                     colIndex === 6 ? "Motor/Versiyon" :
                     "Paket/Donanım";

    for (const option of options) {
      const success = await selectItemInColumn(page, colIndex, option, logLabel);
      if (!success) continue;

      const hasNextColumn = await page.evaluate((idx) => {
        const cols = document.querySelectorAll('.category-step-container');
        return cols.length > idx + 1;
      }, colIndex);

      if (hasNextColumn) {
        await crawlModelDfs(colIndex + 1, resultsArray);
      } else {
        // Leaf reached. Collect path
        const path = await page.evaluate(() => {
          const selected = Array.from(document.querySelectorAll('.category-step-container li.selected'));
          return selected.map(item => {
            const title = item.querySelector('.title') || item;
            return title.textContent.trim();
          });
        });

        const record = {
          category: path[0] || '',
          year: parseInt(path[1]) || 0,
          fuel: path[2] || '',
          brand: path[3] || '',
          model: path[4] || '',
          submodel: path[5] || '',
          generation: path[6] || '',
          spec: path.slice(7).join(' > '),
          fullPath: path.join(' > '),
          scrapedAt: new Date().toISOString()
        };

        console.log(`   ✨ Variant eklendi: ${record.year} > ${record.fuel} > ${record.brand} > ${record.model} > ${record.submodel} > ${record.generation} > ${record.spec}`);
        resultsArray.push(record);
        await sleep(200); // Politeness delay between leaves
      }
    }
  }

  // Generate Year List (2026 down to 2000)
  const years = [];
  for (let y = 2026; y >= 2000; y--) {
    years.push(String(y));
  }

  for (const year of years) {
    await checkPause();
    
    // Select Year
    const yearSuccess = await selectItemInColumn(page, 1, year, "Yıl");
    if (!yearSuccess) {
      console.log(`⚠️  Yıl seçilemedi: ${year}`);
      continue;
    }

    const fuels = await getOptionsInColumn(page, 2);
    for (const fuel of fuels) {
      await checkPause();

      // Click Fuel to see brands
      const fuelSuccess = await selectItemInColumn(page, 2, fuel, "Yakıt");
      if (!fuelSuccess) continue;

      const brands = await getOptionsInColumn(page, 3);
      
      // Check if all brands for this combination are completed
      const allCompleted = brands.every(brand => completedKeys.has(`${year}_${fuel}_${brand}`));
      if (resumeMode && allCompleted) {
        console.log(`  ⏭️  Atlanıyor: Yıl: ${year} | Yakıt: ${fuel} (Tüm markalar taranmış)`);
        continue;
      }

      for (const brand of brands) {
        await checkPause();
        const progressKey = `${year}_${fuel}_brand_${brand}`; // Detailed unique key
        const deprecatedKey = `${year}_${fuel}_${brand}`; // Matches older format
        
        if (resumeMode && (completedKeys.has(progressKey) || completedKeys.has(deprecatedKey))) {
          continue; // Skip silently to avoid spam
        }

        // Select Brand with auto-recovery reset
        let brandSuccess = await selectItemInColumn(page, 3, brand, "Marka");
        if (!brandSuccess) {
          console.log(`    🔄 Marka seçimi kilitlendi ("${brand}"). Sütunlar sıfırlanıyor (Yıl & Yakıt tekrar seçiliyor)...`);
          await selectItemInColumn(page, 1, year, "Yıl (Sıfırlama)");
          await selectItemInColumn(page, 2, fuel, "Yakıt (Sıfırlama)");
          brandSuccess = await selectItemInColumn(page, 3, brand, "Marka (Tekrar)");
        }

        if (!brandSuccess) {
          console.log(`    ⚠️  Marka seçimi tüm denemelere rağmen doğrulanamadı: ${brand}`);
          continue;
        }

        // Start DFS from Model Column (Col 4)
        const brandResults = [];
        await crawlModelDfs(4, brandResults);

        if (brandResults.length > 0) {
          allResults.push(...brandResults);
          fs.writeFileSync(outputFilePath, JSON.stringify(allResults, null, 2));
          console.log(`    💾 Kaydedildi: +${brandResults.length} yeni varyant. Toplam: ${allResults.length}`);
        }

        // Save progress key
        completedKeys.add(progressKey);
        fs.writeFileSync(progressFilePath, JSON.stringify(Array.from(completedKeys), null, 2));
      }
    }
  }

  console.log(`\n🎉 BÜTÜN MARKA VE YILLARIN TARAMASI TAMAMLANDI!`);
  console.log(`Toplam varyant: ${allResults.length}`);
  console.log(`Veri dosyası: ${outputFilePath}`);

  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  await askQuestion("\nBitirmek için ENTER'a basın...");
  await browser.close();
}

main().catch(console.error);
