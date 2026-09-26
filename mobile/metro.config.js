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

/*
 * Paketlar faqat mobile/node_modules dan olinishi kerak. Metro odatda
 * yuqoriga chiqib qidiradi va veb loyihaning node_modules idan (React 18 va
 * boshqa versiyalar) paket topib olishi mumkin — ilova bilmagan holda boshqa
 * versiya bilan yig'ilardi. Pastdagi resolveRequest bunday holatda yig'ishni
 * aniq xato bilan to'xtatadi.
 */
const mobileDir = __dirname + path.sep;
const sharedPrefix = sharedDir + path.sep;
function assertInsideMobile(resolution, moduleName) {
  const file = resolution && resolution.filePath;
  // Virtual modullar (masalan "polyfill:...") haqiqiy fayl emas — tekshirilmaydi
  if (file && path.isAbsolute(file) && !file.startsWith(mobileDir) && !file.startsWith(sharedPrefix)) {
    throw new Error(
      `"${moduleName}" mobile/ dan tashqaridan topildi (${file}). ` +
        `Uni mobile/package.json ga qo'shing: cd mobile && npm install ${moduleName}`,
    );
  }
  return resolution;
}

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
  const resolution = originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
  return assertInsideMobile(resolution, moduleName);
};

module.exports = config;
