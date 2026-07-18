const fetch = require('node-fetch');

async function main() {
  console.log("📡 Fetching Vercel app HTML...");
  const res = await fetch("https://used-car-intelligence.vercel.app/aracini-bul");
  const html = await res.text();
  
  // Find all JS scripts
  const jsMatches = html.match(/src="[^"]+\.js"/g) || [];
  console.log(`Found ${jsMatches.length} JS scripts in HTML.`);
  
  for (const match of jsMatches) {
    const relativeUrl = match.slice(5, -1);
    const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://used-car-intelligence.vercel.app${relativeUrl}`;
    
    console.log(`🔍 Inspecting script: ${fullUrl}`);
    try {
      const scriptRes = await fetch(fullUrl);
      const scriptText = await scriptRes.text();
      
      const apiUrls = scriptText.match(/https?:\/\/[a-zA-Z0-9.-]+\.onrender\.com/g) || [];
      if (apiUrls.length > 0) {
        console.log(`🎯 FOUND API URLs in script:`, Array.from(new Set(apiUrls)));
      }
    } catch (e) {
      console.error(`Failed to fetch ${fullUrl}:`, e.message);
    }
  }
}

main().catch(console.error);
