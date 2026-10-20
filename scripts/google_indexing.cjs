/**
 * Michelle Store - Automated Google Indexing API Script
 * 
 * Automatically submits all URLs from public/urllist.txt to Google Indexing API.
 * Uses pure Node.js built-in modules (crypto, https) - no external packages needed.
 * 
 * Usage:
 *   1. Place your Google Cloud Service Account JSON file as "service-account.json"
 *      in the project root, or set the environment variable GOOGLE_SERVICE_ACCOUNT_JSON.
 *   2. Ensure the Service Account email is added as an "Owner" in Google Search Console.
 *   3. Run: node scripts/google_indexing.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

function loadServiceAccountKey() {
  // Check environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON environment variable:', e.message);
    }
  }

  // Check file paths
  const possiblePaths = [
    path.join(__dirname, '../service-account.json'),
    path.join(__dirname, '../google-key.json'),
    path.join(process.cwd(), 'service-account.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (data.client_email && data.private_key) {
          console.log(`Found Service Account key at: ${p}`);
          return data;
        }
      } catch (e) {
        console.error(`Error reading ${p}:`, e.message);
      }
    }
  }

  return null;
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: exp,
    iat: iat
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const encodedSignature = signature
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${encodedSignature}`;

  const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(`Failed to obtain access token: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function notifyGoogle(url, accessToken, type = 'URL_UPDATED') {
  const payload = JSON.stringify({
    url: url,
    type: type
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      port: 443,
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== Michelle Store - Google Indexing Automation ===\n');

  const serviceAccount = loadServiceAccountKey();
  if (!serviceAccount) {
    console.log('NOTICE: No Google Service Account key found.');
    console.log('To activate automatic Google Indexing:');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
    console.log('2. Enable "Indexing API".');
    console.log('3. Create a Service Account, generate a JSON Key, and save it as "service-account.json" in this directory.');
    console.log('4. In Google Search Console, add the Service Account email as an Owner.');
    console.log('\n(In the meantime, submit your sitemap: https://michellestore.com/sitemap.xml directly into Search Console!)\n');
    return;
  }

  console.log(`Authenticating with Service Account: ${serviceAccount.client_email}...`);
  let accessToken;
  try {
    accessToken = await getAccessToken(serviceAccount);
    console.log('Successfully acquired OAuth2 access token from Google!\n');
  } catch (e) {
    console.error('Authentication Error:', e.message);
    return;
  }

  const urlListFile = path.join(__dirname, '../public/urllist.txt');
  if (!fs.existsSync(urlListFile)) {
    console.error('URL list not found at public/urllist.txt');
    return;
  }

  const urls = fs.readFileSync(urlListFile, 'utf8')
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0);

  console.log(`Found ${urls.length} URLs to index in Google.`);
  console.log('Beginning submission (with rate limiting)...\n');

  let successCount = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await notifyGoogle(url, accessToken);

    if (result.statusCode === 200) {
      console.log(`[${i + 1}/${urls.length}] OK: ${url}`);
      successCount++;
    } else {
      console.log(`[${i + 1}/${urls.length}] FAILED (${result.statusCode}): ${url}`);
      if (result.body) console.log(`       Details: ${result.body}`);
    }

    // Rate-limiting pause: 200ms
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nCompleted! Successfully submitted ${successCount}/${urls.length} URLs to Google Indexing API.`);
}

main().catch(console.error);
