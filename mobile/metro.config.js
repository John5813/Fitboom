const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

/*
 * Ilova veb loyiha bilan bitta repoda turadi. `@shared/...` importlari
 * repo ildizidagi `shared/` papkasiga yo'naltiriladi — narxlar va toifalar
 * veb, server va ilovada bitta manbadan olinadi.
 *
 * Faqat toza modullarni import qiling (pricing, categories, schedule).
 * `shared/schema.ts` drizzle-orm ga bog'liq — uni ilovaga olib kirmang.
 */
const sharedDir = path.resolve(__dirname, "../shared");
config.watchFolders = [...(config.watchFolders || []), sharedDir];

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@shared/")) {
    return context.resolveRequest(
      context,
      path.join(sharedDir, moduleName.slice("@shared/".length)),
      platform,
    );
  }
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "shims/react-native-maps.web.js"),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
