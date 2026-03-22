const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    console.log("---- BROWSER LOGS START ----");
    page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.name}: ${err.message}`));
    page.on('requestfailed', request => console.log(`[REQ FAILED] ${request.url()} - ${request.failure()?.errorText}`));

    try {
        await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 15000 });
        console.log("Page loaded successfully.");
    } catch (e) {
        console.log(`[GOTO ERROR] ${e.message}`);
    }

    // Give it a second to render
    await new Promise(r => setTimeout(r, 2000));

    console.log("---- BROWSER LOGS END ----");
    await browser.close();
})();
