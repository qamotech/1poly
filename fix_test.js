const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let errors = [];
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => { console.log('PAGE ERROR:', err.message); errors.push(err); });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  if(errors.length > 0) process.exit(1);
  await browser.close();
})();
