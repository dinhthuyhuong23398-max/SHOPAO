const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://michellestore.com';
const TODAY = new Date().toISOString().split('T')[0];

const staticPages = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'fabrics', priority: '0.9', changefreq: 'weekly' },
  { path: 'selections', priority: '0.8', changefreq: 'weekly' },
  { path: 'proposal', priority: '0.8', changefreq: 'weekly' },
  { path: 'wardrobe-3d', priority: '0.8', changefreq: 'weekly' },
  { path: 'privacy', priority: '0.3', changefreq: 'monthly' }
];

const designsDir = path.join(__dirname, '../src/content/designs');
const designFiles = fs.readdirSync(designsDir).filter(f => f.endsWith('.json'));

const designs = designFiles.map(file => {
  const content = JSON.parse(fs.readFileSync(path.join(designsDir, file), 'utf8'));
  return content;
}).filter(d => d.published !== false).sort((a, b) => a.order - b.order);

console.log(`Loaded ${designs.length} published designs.`);

const urlEntries = [];

// Static pages (ko and en)
for (const page of staticPages) {
  const relPath = page.path ? `${page.path}/` : '';
  const koUrl = `${DOMAIN}/ko/${relPath}`;
  const enUrl = `${DOMAIN}/en/${relPath}`;

  urlEntries.push({
    loc: koUrl,
    koUrl,
    enUrl,
    lastmod: TODAY,
    changefreq: page.changefreq,
    priority: page.priority
  });

  urlEntries.push({
    loc: enUrl,
    koUrl,
    enUrl,
    lastmod: TODAY,
    changefreq: page.changefreq,
    priority: page.priority
  });
}

// Design pages (ko and en)
for (const design of designs) {
  const koUrl = `${DOMAIN}/ko/designs/${design.slug}/`;
  const enUrl = `${DOMAIN}/en/designs/${design.slug}/`;

  urlEntries.push({
    loc: koUrl,
    koUrl,
    enUrl,
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: '0.8'
  });

  urlEntries.push({
    loc: enUrl,
    koUrl,
    enUrl,
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: '0.8'
  });
}

console.log(`Total URLs generated: ${urlEntries.length}`);

// Generate sitemap.xml
let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

for (const entry of urlEntries) {
  xml += `  <url>\n`;
  xml += `    <loc>${entry.loc}</loc>\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="ko" href="${entry.koUrl}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="en" href="${entry.enUrl}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${entry.koUrl}" />\n`;
  xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
  xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
  xml += `    <priority>${entry.priority}</priority>\n`;
  xml += `  </url>\n`;
}

xml += `</urlset>\n`;

const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Successfully wrote ${sitemapPath} (${Buffer.byteLength(xml)} bytes)`);

// Generate sitemap.txt & urllist.txt
const urlListText = urlEntries.map(e => e.loc).join('\n') + '\n';
const sitemapTxtPath = path.join(__dirname, '../public/sitemap.txt');
const urlListPath = path.join(__dirname, '../public/urllist.txt');
fs.writeFileSync(sitemapTxtPath, urlListText, 'utf8');
fs.writeFileSync(urlListPath, urlListText, 'utf8');
console.log(`Successfully wrote ${sitemapTxtPath} and ${urlListPath}`);
