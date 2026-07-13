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

// Recursive function to crawl category tree down to the leaves
async function crawlCategoryRecursive(page, name, url, currentLevel, pathArray) {
  const currentPath = [...pathArray, name];
  console.log(` -> Taranıyor: ${currentPath.join(' > ')}...`);
  
  const fullUrl = url.startsWith('http') ? url : `https://www.sahibinden.com${url}`;
  
  let success = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      success = true;
      break;
    } catch (e) {
      console.log(`    (Note: Navigation timeout or warning on attempt ${attempt}: ${e.message})`);
      await sleep(2000);
    }
  }

  // Check if we hit Cloudflare on this page transition
  let blocked = await checkIfBlocked(page);
  if (blocked) {
    console.log(`\n⚠️  [DOĞRULAMA TESPİT EDİLDİ] Cloudflare engeli çıktı: ${currentPath.join(' > ')}`);
    console.log("Lütfen Chrome penceresindeki doğrulamayı (Turnstile kutucuğunu) çözün.");
    await askQuestion("Doğrulamayı geçtikten sonra devam etmek için terminalde ENTER'a basın...");
  }
  
  await sleep(1500);

  // Extract subcategories that are deeper than the current level
  const children = await page.evaluate((level) => {
    const listItems = Array.from(document.querySelectorAll('#searchResultLeft-category li, #searchCategoryContainer li, .searchResultsCat li, ul.categoryList li'));
    return listItems.map(li => {
      const a = li.querySelector('a');
      if (!a) return null;
      
      const className = li.className || '';
      const levelMatch = className.match(/cl(\d+)/);
      const levelNum = levelMatch ? parseInt(levelMatch[1]) : 0;
      
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim().replace(/\(\d+\)/g, '').trim(); // Remove count
      return { text, href, level: levelNum };
    }).filter(item => item && item.href && item.text && item.level > level);
  }, currentLevel);

  if (children.length === 0) {
    return [{
      path: currentPath,
      url: fullUrl
    }];
  }

  console.log(`    ${name} altında ${children.length} alt kategori bulundu.`);
  const results = [];
  
  for (const child of children) {
    const subResults = await crawlCategoryRecursive(page, child.text, child.href, child.level, currentPath);
    results.push(...subResults);
    await sleep(1200); // Politeness delay
  }
  
  return results;
}

async function main() {
  console.log("==================================================");
  console.log("    SAHIBINDEN.COM VEHICLE TAXONOMY DEEP SCRAPER");
  console.log("==================================================");
  console.log("Launching local Chrome browser...");

  const browser = await puppeteer.launch({
    headless: false, // Visible window so you can solve CAPTCHAs
    defaultViewport: null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  
  // Set real browser user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Mask webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });
  
  console.log("Navigating to Sahibinden Otomobil Category page...");
  try {
    await page.goto("https://www.sahibinden.com/kategori/otomobil", { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.log("Navigation warning:", err.message);
  }

  console.log("\n[LÜTFEN DİKKAT] Açılan Chrome tarayıcı penceresine bakın:");
  console.log("1. Eğer bot koruması/Turnstile sayfası çıktıysa kutucuğu tıklayıp çözün.");
  console.log("2. Ekranda marka listesi (Abarth, Alfa Romeo, Audi...) görünene kadar bekleyin.");
  await askQuestion("\nMarkalar listesi tarayıcı ekranında TAM OLARAK göründüğünde devam etmek için ENTER'a basın...");

  console.log("Extracting brand list from the page...");
  const brands = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('ul.categoryList a, ul.category-list a, .categories-wrapper a, .sub-categories a, li.cl2 a'));
    return links.map(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim().replace(/\(\d+\)/g, '').trim(); // Remove count
      return { text, href };
    }).filter(b => {
      if (!b.href || !b.text) return false;
      const hrefLower = b.href.toLowerCase();
      const textLower = b.text.toLowerCase();
      
      const isExclude = textLower === 'vasıta' || 
                        textLower === 'otomobil' || 
                        hrefLower.includes('motosiklet') || 
                        hrefLower.includes('vasita') || 
                        hrefLower.includes('ilan') ||
                        hrefLower.includes('destek') ||
                        hrefLower.includes('hesabim') ||
                        b.text.length > 25;
      return !isExclude && b.href.startsWith('/') && b.href !== '/';
    });
  });

  console.log(`Found ${brands.length} brands in the otomobil category.`);
  
  if (brands.length === 0) {
    console.log("Could not find brand elements. Sahibinden HTML structure may have changed, or page is blocked.");
    const debugHtml = await page.content();
    const debugPath = path.join(__dirname, '../scratch/sahibinden_debug_page.html');
    fs.writeFileSync(debugPath, debugHtml);
    console.log(`Saved page source to ${debugPath} for debugging.`);
    await browser.close();
    return;
  }

  console.log("\nBrands discovered:");
  brands.forEach((b, idx) => {
    if (idx < 40) console.log(`  [${idx + 1}] ${b.text}`);
  });
  if (brands.length > 40) console.log("  ...");

  const selection = await askQuestion("\nWhich brand index do you want to DEEP crawl? (Enter number, or type 'all' to crawl all brands): ");
  
  let targetBrands = [];
  if (selection.toLowerCase() === 'all') {
    targetBrands = brands;
    console.log(`\nPreparing to crawl all ${brands.length} brands. This will run in batch mode.`);
  } else {
    const idx = parseInt(selection) - 1;
    if (brands[idx]) {
      targetBrands = [brands[idx]];
    } else {
      console.log("Invalid selection. Exiting.");
      await browser.close();
      return;
    }
  }

  const allTaxonomyResults = [];

  for (let i = 0; i < targetBrands.length; i++) {
    const brand = targetBrands[i];
    console.log(`\n==================================================`);
    console.log(`[Brand ${i + 1} / ${targetBrands.length}] Deep crawl for: ${brand.text}`);
    console.log(`==================================================`);
    
    try {
      const brandResults = await crawlCategoryRecursive(page, brand.text, brand.href, 2, []);
      
      // Validation check: A main brand must have submodels. If we found 0 submodels,
      // it means it was treated as a leaf node, which indicates a block or loading failure!
      if (brandResults.length === 1 && brandResults[0].path.length === 1) {
        console.log(`\n⚠️  [HATA] ${brand.text} için alt model bulunamadı (Cloudflare engeli veya yükleme hatası).`);
        console.log("Lütfen Chrome tarayıcı penceresine gidip doğrulamayı geçin ve sayfanın yüklendiğinden emin olun.");
        const action = await askQuestion("Yeniden denemek için ENTER'a basın (atlamak için 'skip' yazın): ");
        if (action.trim().toLowerCase() !== 'skip') {
          i--; // Decrement index to retry the current brand
          continue;
        }
      }
      
      allTaxonomyResults.push(...brandResults);
    } catch (err) {
      console.error(`Error crawling brand ${brand.text}:`, err.message);
    }

    // Save intermediate results so we never lose progress if it gets stopped
    const formattedResults = allTaxonomyResults.map(item => ({
      brand: item.path[0] || '',
      model: item.path[1] || '',
      submodel: item.path[2] || '',
      generation: item.path[3] || '',
      spec: item.path.slice(4).join(' > '),
      fullPath: item.path.join(' > '),
      url: item.url
    }));

    const outputPath = path.join(__dirname, '../scratch/sahibinden_deep_taxonomy.json');
    fs.writeFileSync(outputPath, JSON.stringify(formattedResults, null, 2));
    
    if (targetBrands.length > 1 && i < targetBrands.length - 1) {
      const delay = Math.floor(Math.random() * 4000) + 4000; // 4 to 8 seconds random delay between brands
      console.log(`Sleeping for ${(delay / 1000).toFixed(1)}s to respect rate limits...`);
      await sleep(delay);
    }
  }

  console.log(`\nDeep crawl completed! Total variants crawled: ${allTaxonomyResults.length}`);
  console.log(`Data successfully saved to: ${path.join(__dirname, '../scratch/sahibinden_deep_taxonomy.json')}`);

  console.log("Closing browser.");
  await browser.close();
}

main().catch(console.error);
