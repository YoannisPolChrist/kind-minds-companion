const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    console.log('Navigating to http://localhost:8081...');
    try {
        await page.goto('http://localhost:8081', { waitUntil: 'load', timeout: 15000 });
        console.log('Page loaded.');
    } catch (e) {
        console.log('Failed to load:', e.message);
    }

    await browser.close();
})();
