const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

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

// Recursive function to crawl category tree on arabam.com
async function crawlCategoryRecursive(page, name, url, pathArray) {
  const currentPath = [...pathArray, name];
  console.log(` -> Taranıyor: ${currentPath.join(' > ')}...`);
  
  const fullUrl = url.startsWith('http') ? url : `https://www.arabam.com${url}`;
  
  let success = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      success = true;
      break;
    } catch (e) {
      console.log(`    (Not: Sayfa yükleme zaman aşımı (Deneme ${attempt}): ${e.message})`);
      await sleep(2000);
    }
  }

  // Check Cloudflare block
  let blocked = await checkIfBlocked(page);
  if (blocked) {
    console.log(`\n⚠️  [DOĞRULAMA TESPİT EDİLDİ] Cloudflare engeli çıktı: ${currentPath.join(' > ')}`);
    console.log("Lütfen açılan tarayıcı penceresinde doğrulamayı çözün.");
    await askQuestion("Doğrulamayı geçtikten sonra devam etmek için ENTER'a basın...");
  }
  
  await sleep(1500);

  // Extract subcategories from the sidebar scroll list
  const rawChildren = await page.evaluate((currentUrlPath) => {
    // Select sidebar list items or general list links
    const links = Array.from(document.querySelectorAll('.ss-content a.list-item, .category-filter a.list-item, ul.category-list a, a.list-item'));
    
    return links.map(a => {
      const href = a.getAttribute('href') || '';
      
      // Clone element to clean text without affecting DOM
      const clone = a.cloneNode(true);
      
      // Remove all elements that typically contain listing count badges/spans
      const badges = clone.querySelectorAll('span, .count, .badge, .listing-count, .number');
      badges.forEach(badge => badge.remove());
      
      // Extract text content and sanitize whitespaces/newlines
      const text = clone.textContent.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      
      return { text, href };
    }).filter(item => {
      if (!item.href || !item.text) return false;
      
      // Ensure it is a subcategory link in the hierarchy
      const itemPath = item.href.split('?')[0];
      const currentClean = currentUrlPath.split('?')[0];
      
      return itemPath.startsWith(currentClean) && 
             itemPath !== currentClean && 
             item.text !== 'Tümünü Gör' && 
             item.text !== 'Diğer';
    });
  }, url);

  // De-duplicate children by URL to prevent redundant crawling and duplicates
  const seenUrls = new Set();
  const children = [];
  for (const child of rawChildren) {
    const cleanUrl = child.href.split('?')[0];
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      children.push({ text: child.text, href: cleanUrl });
    }
  }

  if (children.length === 0) {
    return [{
      path: currentPath,
      url: fullUrl
    }];
  }

  console.log(`    ${name} altında ${children.length} alt kategori bulundu.`);
  const results = [];
  
  for (const child of children) {
    const subResults = await crawlCategoryRecursive(page, child.text, child.href, currentPath);
    results.push(...subResults);
    await sleep(1200); // Politeness delay
  }
  
  return results;
}

async function main() {
  console.log("==================================================");
  console.log("     ARABAM.COM VEHICLE TAXONOMY DEEP SCRAPER");
  console.log("==================================================");
  
  const outputPath = path.join(__dirname, '../scratch/arabam_deep_taxonomy.json');
  let existingResults = [];
  const completedBrands = new Set();

  // Load existing results to support resuming from crash
  if (fs.existsSync(outputPath)) {
    try {
      const content = fs.readFileSync(outputPath, 'utf8');
      if (content.trim()) {
        existingResults = JSON.parse(content);
        existingResults.forEach(item => {
          if (item.brand) {
            completedBrands.add(item.brand.trim());
          }
        });
        console.log(`ℹ️  Bulunan mevcut kayıtlar: ${existingResults.length} adet.`);
        console.log(`ℹ️  Daha önce taranmış markalar (${completedBrands.size} adet):`, Array.from(completedBrands).join(', '));
      }
    } catch (e) {
      console.log("⚠️  Mevcut yedek dosyası okunurken hata oluştu, sıfırdan başlanıyor:", e.message);
    }
  }

  let resumeMode = false;
  if (completedBrands.size > 0) {
    const answer = await askQuestion("\nKaldığın yerden devam etmek (zaten taranmış markaları atlamak) istiyor musun? (evet/hayır): ");
    if (answer.toLowerCase().startsWith('e') || answer.toLowerCase().startsWith('y')) {
      resumeMode = true;
      console.log("▶️  Kaldığı yerden devam etme modu etkin. Tamamlanan markalar atlanacak.");
    }
  }

  console.log("\nLaunching local Chrome browser...");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });
  
  console.log("Navigating to Arabam Otomobil Category page...");
  try {
    await page.goto("https://www.arabam.com/ikinci-el/otomobil", { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.log("Navigation warning:", err.message);
  }

  console.log("\n[LÜTFEN DİKKAT] Açılan Chrome tarayıcı penceresine bakın:");
  console.log("1. Eğer çerez onay penceresi çıkarsa kabul edin/kapatın.");
  console.log("2. Sol menüde markaların (Alfa Romeo, Audi, BMW...) göründüğünden emin olun.");
  await askQuestion("\nMarkalar listesi tarayıcı ekranında göründüğünde devam etmek için ENTER'a basın...");

  console.log("Extracting brand list from the page...");
  const rawBrands = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.ss-content a.list-item, a.list-item'));
    return links.map(a => {
      const href = a.getAttribute('href') || '';
      const clone = a.cloneNode(true);
      const badges = clone.querySelectorAll('span, .count, .badge, .listing-count, .number');
      badges.forEach(b => b.remove());
      const text = clone.textContent.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      return { text, href };
    }).filter(b => {
      if (!b.href || !b.text) return false;
      const isOtomobil = b.href.startsWith('/ikinci-el/otomobil/');
      const textLower = b.text.toLowerCase();
      const isExclude = textLower === 'tümünü gör' || 
                        textLower === 'diğer' ||
                        textLower === 'otomobil' ||
                        textLower === 'vasıta';
      return isOtomobil && !isExclude;
    });
  });

  // De-duplicate brand list
  const uniqueBrands = [];
  const seenBrandUrls = new Set();
  for (const b of rawBrands) {
    const cleanUrl = b.href.split('?')[0];
    if (!seenBrandUrls.has(cleanUrl)) {
      seenBrandUrls.add(cleanUrl);
      uniqueBrands.push({ text: b.text, href: cleanUrl });
    }
  }

  console.log(`Found ${uniqueBrands.length} unique brands in the otomobil category.`);
  
  if (uniqueBrands.length === 0) {
    console.log("Could not find brand elements. Arabam HTML structure may have changed, or page is blocked.");
    await browser.close();
    return;
  }

  console.log("\nBrands discovered:");
  uniqueBrands.forEach((b, idx) => {
    const isCompleted = completedBrands.has(b.text);
    console.log(`  [${idx + 1}] ${b.text} ${isCompleted ? '✅ (Taranmış)' : ''}`);
  });

  const selection = await askQuestion("\nWhich brand index do you want to DEEP crawl? (Enter number, or type 'all' to crawl all brands): ");
  
  let targetBrands = [];
  if (selection.toLowerCase() === 'all') {
    targetBrands = uniqueBrands;
    console.log(`\nPreparing to crawl all ${uniqueBrands.length} brands.`);
  } else {
    const idx = parseInt(selection) - 1;
    if (uniqueBrands[idx]) {
      targetBrands = [uniqueBrands[idx]];
    } else {
      console.log("Invalid selection. Exiting.");
      await browser.close();
      return;
    }
  }

  // Filter out already crawled brands if resumeMode is active
  if (resumeMode) {
    targetBrands = targetBrands.filter(b => !completedBrands.has(b.text));
    console.log(`⏭️  Kaldığı yerden devam etme filtresi uygulandı. Yeni taranacak marka sayısı: ${targetBrands.length}`);
  }

  const allTaxonomyResults = resumeMode ? [...existingResults] : [];

  for (let i = 0; i < targetBrands.length; i++) {
    const brand = targetBrands[i];
    console.log(`\n==================================================`);
    console.log(`[Brand ${i + 1} / ${targetBrands.length}] Deep crawl for: ${brand.text}`);
    console.log(`==================================================`);
    
    try {
      const brandResults = await crawlCategoryRecursive(page, brand.text, brand.href, []);
      
      if (brandResults.length === 1 && brandResults[0].path.length === 1) {
        console.log(`\n⚠️  [HATA] ${brand.text} için alt model bulunamadı.`);
        console.log("Lütfen Chrome tarayıcı penceresine gidip doğrulamayı geçin ve sayfanın yüklendiğinden emin olun.");
        const action = await askQuestion("Yeniden denemek için ENTER'a basın (atlamak için 'skip' yazın): ");
        if (action.trim().toLowerCase() !== 'skip') {
          i--; // Retry
          continue;
        }
      }
      
      // If we crawled successfully, append them to our collection
      const formattedResults = brandResults.map(item => ({
        brand: item.path[0] || '',
        model: item.path[1] || '',
        submodel: item.path[2] || '',
        generation: item.path[3] || '',
        spec: item.path.slice(4).join(' > '),
        fullPath: item.path.join(' > '),
        url: item.url
      }));

      // Filter out any previous entries for this brand to prevent duplicates if user restarted
      const cleanResults = allTaxonomyResults.filter(item => item.brand !== brand.text);
      cleanResults.push(...formattedResults);

      // Save immediately to file
      fs.writeFileSync(outputPath, JSON.stringify(cleanResults, null, 2));
      console.log(`💾 Saved results for ${brand.text}. Total overall records: ${cleanResults.length}`);
      
      // Update memory accumulator
      allTaxonomyResults.length = 0;
      allTaxonomyResults.push(...cleanResults);

    } catch (err) {
      console.error(`Error crawling brand ${brand.text}:`, err.message);
    }
    
    if (targetBrands.length > 1 && i < targetBrands.length - 1) {
      const delay = Math.floor(Math.random() * 4000) + 4000;
      console.log(`Sleeping for ${(delay / 1000).toFixed(1)}s to respect rate limits...`);
      await sleep(delay);
    }
  }

  console.log(`\nDeep crawl completed! Total variants in database: ${allTaxonomyResults.length}`);
  console.log(`Data successfully saved to: ${outputPath}`);

  console.log("Closing browser.");
  await browser.close();
}

main().catch(console.error);
