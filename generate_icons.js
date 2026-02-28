const sharp = require('sharp');

async function generate() {
    try {
        console.log("Loading logos...");

        // Resize logo for use inside composites
        const logoBuffer = await sharp('assets/logo-transparent.png')
            .resize(800, 800, { fit: 'inside' })
            .toBuffer();

        // 1. icon.png (1024x1024, white background, iOS/default)
        console.log("Generating icon.png...");
        await sharp({
            create: {
                width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        })
            .composite([{ input: logoBuffer }])
            .png()
            .toFile('assets/icon.png');

        // 2. adaptive-icon.png (1024x1024, transparent background, Android)
        console.log("Generating adaptive-icon.png...");
        const adaptLogoBuffer = await sharp('assets/logo-transparent.png')
            .resize(600, 600, { fit: 'inside' })
            .toBuffer();

        await sharp({
            create: {
                width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([{ input: adaptLogoBuffer }])
            .png()
            .toFile('assets/adaptive-icon.png');

        // 3. favicon.png (48x48, transparent)
        console.log("Generating favicon.png...");
        const favLogoBuffer = await sharp('assets/logo-transparent.png')
            .resize(48, 48, { fit: 'inside' })
            .toBuffer();

        await sharp({
            create: { width: 48, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        })
            .composite([{ input: favLogoBuffer }])
            .png()
            .toFile('assets/favicon.png');

        // 4. splash-icon.png (1024x1024, transparent background)
        console.log("Generating splash-icon.png...");
        await sharp({
            create: {
                width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([{ input: logoBuffer }])
            .png()
            .toFile('assets/splash-icon.png');

        console.log("Done!");
    } catch (e) {
        console.error(e);
    }
}

generate();
