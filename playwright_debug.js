const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
    console.log('Starting Playwright...');
    const logs = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            logs.push(`[Browser ${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        logs.push(`[Browser PAGE ERROR] ${error.message}\n${error.stack}`);
    });

    page.on('requestfailed', request => {
        console.log(`[Browser REQUEST FAILED]`, request.url(), request.failure().errorText);
    });

    console.log('Navigating to http://localhost:8098...');
    try {
        await page.goto('http://localhost:8098', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Page loaded successfully');
    } catch (error) {
        console.log('Error navigating:', error.message);
    }

    // Wait a bit to ensure async errors are caught
    await page.waitForTimeout(5000);

    await browser.close();
    fs.writeFileSync('errors.log', logs.join('\n'));
    console.log('Done.');
})();
