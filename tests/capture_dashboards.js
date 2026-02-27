const { chromium } = require('playwright');

(async () => {
    let browser;
    try {
        console.log("Starting browser...");
        browser = await chromium.launch();
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

        console.log("Navigating to http://localhost:8082");
        await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000); // let animations settle

        await page.screenshot({ path: 'debug_ui_error.png' });
        console.log("Saved debug_ui_error.png");

    } catch (e) {
        console.error("Script failed:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
