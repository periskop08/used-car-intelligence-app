import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY');
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: 'Audi A3 2020 35 TFSI displacement engine cc and horsepower specs' }] }
      ],
      tools: [
        { google_search: {} }
      ]
    })
  });
  console.log('Status:', res.status);
  const data = (await res.json()) as any;
  console.log('Metadata keys:', Object.keys(data.candidates?.[0]?.groundingMetadata || {}));
  console.log('Search queries:', data.candidates?.[0]?.groundingMetadata?.webSearchQueries);
  console.log('Grounding supports:', JSON.stringify(data.candidates?.[0]?.groundingMetadata?.groundingSupports?.slice(0, 3), null, 2));
  console.log('Text:', data.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 300));
}

test().catch(console.error);
