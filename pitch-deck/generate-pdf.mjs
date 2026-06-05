import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'index.html');
const outHtmlPath = join(__dirname, 'index-embedded.html');
const outPdfPath = join(__dirname, 'mercado-modular-pr.pdf');

// All image URLs found in the presentation
const imageUrls = [
  'https://nuconic.com/wp-content/uploads/2025/03/NUCONIC-Dorado-HEADER.jpg',
  'https://nuconic.com/wp-content/uploads/2025/04/NUCONIC-Palma-Nido-nowa-HEADER-desktop.jpg',
  'https://nuconic.com/wp-content/uploads/2025/04/1-1-1024x715.jpg',
  'https://nuconic.com/wp-content/uploads/2025/03/Dorado-Grove-2.jpg',
  'https://nuconic.com/wp-content/uploads/2025/03/1-1024x576.jpg',
  'https://nuconic.com/wp-content/uploads/2025/03/2-1024x576.jpg',
  'https://nuconic.com/wp-content/uploads/2025/03/3-1024x576.jpg',
  'https://nuconic.com/wp-content/uploads/2025/04/NUCONIC-DEVELOPMENTS-Palma-Nido-1024x674.jpg',
  'https://nuconic.com/wp-content/uploads/2025/04/Photo4-1920x999.jpg',
  'https://cdn.prod.website-files.com/672bddf2d4c953c9be42ab8c/67f3d2ed5669232094c7f230_Casa%20Mar%20Azul.png',
  'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/QbCOk97wwD0KIbfB9RNo/media/68a86de73a9e2928649e4f90.png',
  'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/QbCOk97wwD0KIbfB9RNo/media/68a86eaa7dc6b063f77034e0.png',
  'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/QbCOk97wwD0KIbfB9RNo/media/68a8760b3a9e2920349f3ae4.png',
];

async function fetchAsBase64(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': 'https://nuconic.com/',
    },
  });
  if (!resp.ok) {
    console.warn(`  WARN: ${resp.status} for ${url}`);
    return null;
  }
  const ct = resp.headers.get('content-type') || 'image/jpeg';
  const buf = await resp.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');
  return `data:${ct};base64,${b64}`;
}

async function main() {
  console.log('Downloading images...');
  const replacements = new Map();

  for (const url of imageUrls) {
    process.stdout.write(`  ${url.split('/').pop().substring(0, 50)}... `);
    try {
      const dataUri = await fetchAsBase64(url);
      if (dataUri) {
        replacements.set(url, dataUri);
        console.log('OK');
      } else {
        console.log('FAILED');
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }

  console.log(`\nEmbedding ${replacements.size}/${imageUrls.length} images...`);
  let html = readFileSync(htmlPath, 'utf8');
  for (const [url, dataUri] of replacements) {
    // Replace all occurrences (URL-encoded and plain)
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(escaped, 'g'), dataUri);
  }

  writeFileSync(outHtmlPath, html, 'utf8');
  console.log(`Written: ${outHtmlPath}`);

  console.log('\nLaunching Chromium to generate PDF...');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Set viewport to standard presentation size (16:9 at 1280px)
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`file://${outHtmlPath}`, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for Chart.js to render
  await page.waitForTimeout(2000);

  // PDF with landscape A4, one slide per page
  // We'll capture each slide as a full page
  await page.pdf({
    path: outPdfPath,
    landscape: true,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  console.log(`\nPDF written: ${outPdfPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
