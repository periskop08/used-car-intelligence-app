const puppeteer = require('puppeteer');
const readline = require('readline');

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

async function main() {
  console.log("==================================================");
  console.log("   ARABAM.COM WIZARD DOM INSPECTOR");
  console.log("==================================================");
  console.log("Launching local Chrome browser...");

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

  console.log("Navigating to https://www.arabam.com/ilan-ver/...");
  await page.goto("https://www.arabam.com/ilan-ver/", { waitUntil: 'domcontentloaded' });

  console.log("\n[TALİMATLAR]");
  console.log("1. Açılan tarayıcı penceresinde üye girişi yapın.");
  console.log("2. İlan Verme -> Araç Seçimi bölümüne gelin (ekranda sütunlar görünmeli).");
  console.log("3. Hazır olduğunuzda bu terminale dönün ve ENTER'a basın.");
  
  await askQuestion("\nSayfa hazır olduğunda analiz etmek için ENTER'a basın...");

  console.log("\nRunning DOM analysis on the wizard columns...");

  const analysis = await page.evaluate(() => {
    // Let's find any containers, lists, list items, and scrollable columns
    const divs = Array.from(document.querySelectorAll('div'));
    
    // We want to find containers with class names related to columns, steps, selection, step-by-step
    const possibleContainers = divs.filter(d => {
      const cls = (d.className || '').toLowerCase();
      const id = (d.id || '').toLowerCase();
      return cls.includes('column') || cls.includes('step') || cls.includes('select') || cls.includes('wizard') || 
             id.includes('column') || id.includes('step') || id.includes('select') || id.includes('wizard');
    }).map(d => ({
      tagName: d.tagName,
      id: d.id,
      className: d.className,
      childCount: d.children.length,
      textPreview: d.innerText ? d.innerText.substring(0, 100).replace(/\s+/g, ' ') : ''
    }));

    // Let's search for lists (ul, ol) or elements with role="listbox" or list-like elements
    const lists = Array.from(document.querySelectorAll('ul, ol, [class*="list"], [class*="column"], [class*="step"]'))
      .map(el => {
        const items = Array.from(el.querySelectorAll('li, div, a, span')).slice(0, 5).map(item => ({
          tagName: item.tagName,
          className: item.className,
          text: item.innerText ? item.innerText.trim().replace(/\s+/g, ' ') : ''
        }));

        return {
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          itemsCount: el.children.length,
          sampleItems: items
        };
      }).filter(l => l.itemsCount > 0).slice(0, 20);

    // Let's look for the active selection path element
    const breadcrumbs = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const text = el.innerText || '';
        return text.includes('Otomobil >') && text.length < 200;
      })
      .map(el => ({
        tagName: el.tagName,
        className: el.className,
        text: el.innerText.trim()
      }));

    return {
      title: document.title,
      url: window.location.href,
      breadcrumbs,
      lists,
      possibleContainers: possibleContainers.slice(0, 15)
    };
  });

  console.log("\n=================== ANALİZ SONUÇLARI ===================");
  console.log("Sayfa Başlığı:", analysis.title);
  console.log("Mevcut URL:", analysis.url);
  console.log("\nYol Gösterici (Breadcrumbs) Adayları:", JSON.stringify(analysis.breadcrumbs, null, 2));
  console.log("\nSütun / Liste Yapıları (İlk 20 Aday):", JSON.stringify(analysis.lists, null, 2));
  console.log("\nOlası Konteynerler:", JSON.stringify(analysis.possibleContainers, null, 2));
  console.log("========================================================");

  await askQuestion("\nAnaliz tamamlandı. Tarayıcıyı kapatmak için ENTER'a basın...");
  await browser.close();
}

main().catch(console.error);
