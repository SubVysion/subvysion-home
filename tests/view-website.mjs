// Navigate to the website and capture screenshot
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to the website...');
    await page.goto('http://localhost:5173');
    
    console.log('Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    
    console.log('Getting page title...');
    const title = await page.title();
    console.log('Page title:', title);
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'website-screenshot.png', fullPage: true });
    
    console.log('Screenshot saved to website-screenshot.png');
    
    console.log('Page content:');
    const content = await page.textContent('body');
    console.log(content.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();