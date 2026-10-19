# AI assist — mobil ilova (iOS / Android)

Lokomotiv mashinistlari uchun ovozli yordamchi. Ilovada mashinist savolni ovoz bilan beradi va texnik bilimlar bazasidan javob oladi (matn va ovoz). Shuningdek, nosozlik haqida xabar yuboradi va o'quv materiallarini (testlar, ВЛ80с, КЛУБ-У, ПТЭ) o'qiydi.

Texnologiyalar: **Expo SDK 57** (React Native 0.86, React 19, TypeScript). Build **EAS Build** orqali bulutda qilinadi, shuning uchun iOS build uchun Mac shart emas.

Backend (server) tayyor va ishlab turibdi, unga tegish kerak emas:

| | |
|---|---|
| API | `https://83-69-136-154.sslip.io` |
| Maxfiylik siyosati (do'konlar uchun) | `https://83-69-136-154.sslip.io/privacy.html` |

---

## 1. Lokal ishga tushirish

Talablar: Node.js 20+, telefonda **Expo Go** (SDK 57).

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npx expo start -c
```

QR kodni Expo Go bilan skanerlang. Kirish uchun login va parolni loyiha egasidan oling.

Tip tekshiruvi: `npx tsc --noEmit`

## 2. Bir martalik sozlash

```bash
npm install -g eas-cli
eas login                   # tashkilotning Expo akkaunti
eas init                    # app.json ga yangi projectId yoziladi — shu o'zgarishni commit qiling
```

Ilova identifikatorlari (`app.json`). Do'konga birinchi marta chiqqandan keyin ularni **o'zgartirib bo'lmaydi**. Kerak bo'lsa, birinchi build'dan **oldin** o'zgartiring:

- iOS: `com.temiryollari.mashinist` (`ios.bundleIdentifier`)
- Android: `com.temiryollari.mashinist` (`android.package`)

## 3. Build

Server manzili `eas.json` dagi `EXPO_PUBLIC_API_URL` orqali build ichiga yoziladi (`preview` va `production` profillari).

| Maqsad | Buyruq | Natija |
|---|---|---|
| Sinov uchun APK (telefonga to'g'ridan-to'g'ri o'rnatiladi) | `eas build -p android --profile preview` | `.apk` |
| Google Play | `eas build -p android --profile production` | `.aab` |
| App Store / TestFlight | `eas build -p ios --profile production` | `.ipa` |

- **Versiya raqamlari:** `production` build'larda `versionCode` va `buildNumber` avtomatik oshadi (`appVersionSource: remote`). Foydalanuvchiga ko'rinadigan versiyani (`1.0.0`) `app.json` → `expo.version` da qo'lda oshiring.
- **Android imzosi:** birinchi build'da EAS kalit (keystore) yaratishni taklif qiladi, **Yes** deng. Kalit EAS'da saqlanadi. Uni yo'qotmang: usiz Play'dagi ilovani yangilab bo'lmaydi.
- **iOS sertifikatlari:** EAS Apple Developer akkauntiga kirib, sertifikat va provisioning profile'ni o'zi yaratadi.

## 4. Do'konlarga yuklash

```bash
eas submit -p android --profile production   # Play Console → Internal testing
eas submit -p ios --profile production       # App Store Connect → TestFlight
```

- **Google Play:** birinchi `.aab` ni Play Console'ga **qo'lda** yuklash kerak (Play talabi). Keyingilari `eas submit` bilan yuklanadi. Buning uchun Google Cloud'da service account JSON kerak: https://docs.expo.dev/submit/android/
- **App Store:** `eas submit` Apple ID bilan kiradi va App Store Connect'da ilovani o'zi yaratadi.

## 5. Do'kon sahifasi uchun ma'lumotlar

| Maydon | Qiymat |
|---|---|
| Nomi | AI assist |
| Kategoriya | Business (yoki Education) |
| Maxfiylik siyosati URL | https://83-69-136-154.sslip.io/privacy.html |
| Narx | Bepul, reklamasiz, ichki xaridsiz |
| Yosh chegarasi | 4+ / Everyone |
| Shifrlash (Apple export compliance) | Faqat standart HTTPS. `app.json` da `ITSAppUsesNonExemptEncryption: false` qo'yilgan |

**Data safety (Play) / App Privacy (Apple):** quyidagi ma'lumotlar yig'iladi. Ular faqat ilova funksiyasi uchun ishlatiladi, kuzatish va reklama yo'q, shifrlangan holda uzatiladi:

- ism va foydalanuvchi ID'si;
- ovoz yozuvlari;
- rasm va videolar (nosozlik xabarlari);
- savollar tarixi (ilova ichidagi kontent).

Qisqa tavsif:
> Lokomotiv mashinistlari uchun ovozli yordamchi: nosozlik bo'yicha savolga texnik bazadan darhol javob, nosozlik xabarlari va o'quv materiallari.

### Muhim: ilova faqat login bilan ishlaydi

Ro'yxatdan o'tish yo'q, hisoblarni depo administratori yaratadi. Shuning uchun:

1. **Test hisob.** Apple va Google tekshiruvchilariga test hisob kerak. Loyiha egasi admin panelda (`https://83-69-136-154.sslip.io` → Foydalanuvchilar) alohida test foydalanuvchi yaratib beradi. Login va parolni App Store Connect → *App Review Information → Sign-in required* va Play Console → *App access* bo'limiga yozing.
2. **Tekshiruvchi uchun izoh** (App Review Notes):
   > Internal app for locomotive drivers of Uzbekistan Railways. Accounts are created by the depot administrator; there is no public sign-up. Use the demo account above. After login the app asks to set a 4-digit PIN (any digits).
3. **Apple talabi.** Agar Apple ilovani "faqat ichki xodimlar uchun" deb rad etsa, **Unlisted App Distribution** so'rovini yuboring (ilova faqat havola orqali ochiladi): https://developer.apple.com/contact/request/unlisted-app/

## 6. Loyiha tuzilishi

```
App.tsx                 tab navigatsiya, PIN qulfi
src/api/voiceApi.ts     backend bilan aloqa (EXPO_PUBLIC_API_URL)
src/screens/            Ovoz, Buzilish, O'rganish, Profil, Login, PIN
src/learn/              o'quv bo'limi (testlar, ВЛ80с, КЛУБ-У, taqdimot, hujjatlar)
src/i18n.tsx, i18n.ru.ts  interfeys tili: o'zbekcha (kalit) / ruscha
src/theme.tsx           yorug' / qorong'i mavzu
assets/                 ikonka, splash, o'quv rasmlari
```

- **Server manzilini almashtirish** (masalan, domen olinganda): `eas.json` dagi `EXPO_PUBLIC_API_URL` ni (ikkala profilda) yangilang va qayta build qiling.
- **Interfeys matnlari:** o'zbekcha matn kalit hisoblanadi, ruscha tarjimasi `src/i18n.ru.ts` da. Kontent (savol-javoblar, kitoblar, testlar) tarjima qilinmaydi.
