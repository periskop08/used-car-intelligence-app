const axios = require('axios');
const fs = require('fs');
const path = require('path');
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("==================================================");
  console.log("    APIFY SAHIBINDEN CAR SCRAPER INTEGRATION");
  console.log("==================================================");

  let token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.log("Apify API Token is not set in environment.");
    console.log("You can find your token at: https://console.apify.com/account#/integrations");
    token = await askQuestion("Please enter your Apify API Token: ");
    token = token.trim();
  }

  if (!token) {
    console.log("No token provided. Exiting.");
    return;
  }

  const actorId = "uggGOdZVbvdSugbo8"; // lightkong/sahibinden-car-scraper
  
  // We will run the scraper with a small limit (e.g. 5 items) for testing
  const input = {
    startUrls: [
      { url: "https://www.sahibinden.com/vasita/otomobil?sorting=date_desc" }
    ],
    maxItems: 5,
    proxySettings: {
      useApifyProxy: true
    }
  };

  console.log(`\nTriggering Apify Actor (${actorId}) with 5 test items...`);
  try {
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/lightkong~sahibinden-car-scraper/runs?token=${token}`,
      input,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const runId = runResponse.data.data.id;
    const defaultDatasetId = runResponse.data.data.defaultDatasetId;
    console.log(`Actor run started! Run ID: ${runId}`);
    console.log(`Default Dataset ID: ${defaultDatasetId}`);
    console.log("Waiting for scraper to finish (polling status)...");

    let isFinished = false;
    while (!isFinished) {
      await sleep(5000);
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/acts/lightkong~sahibinden-car-scraper/runs/${runId}?token=${token}`
      );
      const status = statusResponse.data.data.status;
      console.log(` - Run status: ${status}`);

      if (status === 'SUCCEEDED') {
        isFinished = true;
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        console.log(`Run failed with status: ${status}`);
        return;
      }
    }

    console.log("\nDownloading dataset results from Apify...");
    const datasetResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${token}`
    );

    const items = datasetResponse.data;
    console.log(`Downloaded ${items.length} items successfully!`);

    const outputPath = path.join(__dirname, '../scratch/apify_sahibinden_listings.json');
    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Results saved to: ${outputPath}`);

    // Print sample item structure to let the user see the taxonomy keys
    if (items.length > 0) {
      console.log("\nSample Listing Data Structure:");
      console.log(JSON.stringify(items[0], null, 2));
    }

  } catch (error) {
    console.error("Error communicating with Apify API:", error.response ? error.response.data : error.message);
  }
}

main().catch(console.error);
