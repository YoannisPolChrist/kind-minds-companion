const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Zustand's ESM build uses `import.meta.env` which breaks Metro web bundler.
// Force it to use CommonJS builds for all platforms.
config.resolver = config.resolver || {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "zustand") {
        return {
            filePath: path.resolve(__dirname, "node_modules/zustand/index.js"),
            type: "sourceFile",
        };
    }
    if (moduleName === "zustand/middleware") {
        return {
            filePath: path.resolve(__dirname, "node_modules/zustand/middleware.js"),
            type: "sourceFile",
        };
    }
    if (moduleName === "zustand/vanilla") {
        return {
            filePath: path.resolve(__dirname, "node_modules/zustand/vanilla.js"),
            type: "sourceFile",
        };
    }
    // Fall back to default resolver for everything else
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
