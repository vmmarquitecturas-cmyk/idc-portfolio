import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve('./plan_pdf.html'), 'utf-8');

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  headless: true,
});

const page = await browser.newPage();

// Load HTML directly
await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for Google Fonts
await new Promise(r => setTimeout(r, 2000));

await page.pdf({
  path: 'PLAN_ESTRATEGICO_VIDA_ARQUITECTURA.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  preferCSSPageSize: true,
});

await browser.close();
console.log('PDF generado: PLAN_ESTRATEGICO_VIDA_ARQUITECTURA.pdf');
