const fs = require('fs');

async function test() {
  const query = "Renault Clio 2020";
  const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=10`);
  const data = await res.json();
  console.log(JSON.stringify(data.results.map(r => ({
    id: r.id,
    description: r.description || r.alt_description,
    url: r.urls.regular,
    user: r.user.name
  })), null, 2));
}

test().catch(console.error);
