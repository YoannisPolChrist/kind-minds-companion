const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.log(`[Page Error] ${error.message}`);
    });

    try {
        console.log('Navigating to http://localhost:8081 ...');
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        console.log('Body HTML:\n', bodyHTML);

        const rootStyle = await page.evaluate(() => {
            const r = document.getElementById('root');
            return r ? r.style.cssText : 'No root found';
        });
        console.log('Root element inline styles:', rootStyle);

    } catch (err) {
        console.error('Failed to capture:', err);
    }

    await browser.close();
})();
