const { chromium } = require('playwright');

(async () => {
    let browser;
    try {
        console.log("Starting browser...");
        browser = await chromium.launch();
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

        let start = Date.now();
        page.on('console', msg => {
            const time = Date.now() - start;
            console.log(`[${time}ms] ${msg.type().toUpperCase()}: ${msg.text()}`);
        });

        console.log("Navigating to http://localhost:8083");
        await page.goto('http://localhost:8083', { waitUntil: 'networkidle', timeout: 30000 });

        console.log("WAITING ON LOGIN...");
        await page.waitForSelector('input[type="email"]');

        console.log("LOGGING IN...");
        await page.fill('input[type="email"]', 'gs.johanneschrist@gmail.com');
        await page.fill('input[type="password"]', 'password123');

        const buttons = page.locator('div[role="button"]');
        if (await buttons.count() > 0) {
            await buttons.nth(0).click();
        } else {
            await page.click('text=/Anmelden|Login/i');
        }

        console.log("WAITING FOR DATA LOAD (10s)...");
        await page.waitForTimeout(10000);
        console.log("TEST FINISHED");

    } catch (e) {
        console.error("Script failed:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
