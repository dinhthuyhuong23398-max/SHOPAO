const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'michellestore.com';
const KEY = 'michelle8f73b642e88a4e10b10e527b102b4d89';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const urlListFile = path.join(__dirname, '../public/urllist.txt');
if (!fs.existsSync(urlListFile)) {
  console.error('public/urllist.txt not found. Run generate_sitemap first.');
  process.exit(1);
}

const urls = fs.readFileSync(urlListFile, 'utf8')
  .split('\n')
  .map(u => u.trim())
  .filter(u => u.length > 0);

console.log(`Submitting ${urls.length} URLs to IndexNow (Bing, Naver, Yandex, Seznam)...`);

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urls
});

const options = {
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`IndexNow Response Status: ${res.statusCode} ${res.statusMessage}`);
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log('SUCCESS: All URLs successfully submitted to IndexNow for instant search engine indexing!');
    } else {
      console.log('Response body:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`IndexNow Request Error: ${e.message}`);
});

req.write(payload);
req.end();
