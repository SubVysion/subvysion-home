// Basic Puppeteer server for MCP integration
import { chromium } from 'playwright';

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

// MCP server functionality
export const puppeteerServer = {
  navigate: async (url: string) => {
    await page.goto(url);
    return {
      title: await page.title(),
      url: page.url(),
      content: await page.textContent('body')
    };
  },
  
  screenshot: async (options?: { path?: string }) => {
    return await page.screenshot(options);
  },
  
  click: async (selector: string) => {
    await page.click(selector);
    return {
      url: page.url(),
      content: await page.textContent('body')
    };
  },
  
  type: async (selector: string, text: string) => {
    await page.fill(selector, text);
    return {
      value: await page.inputValue(selector),
      url: page.url()
    };
  },
  
  close: async () => {
    await browser.close();
  }
};

// Keep the server running
process.on('SIGINT', async () => {
  await browser.close();
  process.exit(0);
});

console.log(''Puppeteer MCP server is running...'');