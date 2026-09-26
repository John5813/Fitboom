# FitBoom — mobil ilova

Expo (React Native) ilova. Ilgari alohida `Fitboomapp` reposida edi; endi veb
sayt va server bilan bitta repoda, `mobile/` papkasida. Tarixi saqlangan
(`git log -- mobile/`).

## Nega bitta repoda

Ilova serverning `/api/mobile/v1` API siga ulanadi va narxlar, zal
toifalari kabi qoidalarni veb bilan bo'lishadi. Alohida repoda bular ikki
joyda yozilib, bir-biridan ajralib ketardi: masalan, ilovadagi zaxira narxlar
60 000 / 130 000 / 240 000 so'm bo'lib qolgan edi, haqiqiy narxlar esa
180 000 / 350 000 / 600 000.

Endi umumiy kod repo ildizidagi `shared/` da turadi va ilovada `@shared/...`
orqali import qilinadi (`metro.config.js`, `tsconfig.json`):

```ts
import { CREDIT_PACKAGES } from "@shared/pricing";
```

Faqat toza modullarni import qiling: `pricing`, `categories`, `schedule`.
`shared/schema.ts` drizzle-orm ga bog'liq — ilovaga olib kirmang.

## Ishga tushirish

Ilova veb loyihadan alohida npm loyiha (React 19 / Expo 54; vebda React 18):

```bash
cd mobile
npm install
npm run tunnel      # telefonda Expo Go ilovasi bilan QR ni skanerlang
```

## Yig'ish (APK / AAB)

EAS orqali (`eas.json`, loyiha egasi `javlon5813`):

```bash
npm install -g eas-cli
eas login
npm run build:android            # sinov uchun APK (preview)
eas build -p android --profile production
```

## API

`services/api.ts` — yagona API klienti, `https://fitboom.replit.app/api/mobile/v1`
ga ulanadi. Server tomoni: `../server/mobileRoutes.ts`.
