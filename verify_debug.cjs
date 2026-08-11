const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5174';
const EMAIL = 'priya.sharma@university.edu';
const PASSWORD = 'Faculty@123';
const OUTPUT_DIR = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\4f990444-93d6-4a91-b14e-c8ae7effefd4';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Diagnostic]') || text.includes('[Pagination]') || text.includes('Failed')) {
      console.log('BROWSER:', text);
    }
  });

  try {
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    console.log('Login OK. Navigating to /reports...');

    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    const consolidatedBtn = page.locator('button').filter({ hasText: /consolidated/i }).first();
    await consolidatedBtn.click();
    console.log('Clicked Consolidated Report tab.');
    await page.waitForTimeout(3000);

    console.log('Triggering PDF download...');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }),
      page.click('button:has-text("Download PDF Report")')
    ]);

    const pdfPath = path.join(OUTPUT_DIR, 'Downloaded_Consolidated_Report.pdf');
    await download.saveAs(pdfPath);
    console.log(`PDF saved to: ${pdfPath}`);

    // Wait 2 seconds for state updates to fully complete
    await page.waitForTimeout(2000);

    // Retrieve __debug_pngs from browser window context
    const pngs = await page.evaluate(() => window.__debug_pngs || []);
    console.log(`Retrieved ${pngs.length} debug canvas PNGs.`);

    for (let i = 0; i < pngs.length; i++) {
      const base64Data = pngs[i].replace(/^data:image\/png;base64,/, "");
      const pngPath = path.join(OUTPUT_DIR, `canvas_page_${i + 1}.png`);
      fs.writeFileSync(pngPath, base64Data, 'base64');
      console.log(`Saved debug canvas page ${i + 1} to ${pngPath}`);
    }

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }
}
main();
