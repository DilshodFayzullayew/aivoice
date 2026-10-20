# O'zgarishlar tarixi

Versiyalar [Semantic Versioning](https://semver.org/) bo'yicha yuritiladi: `MAJOR.MINOR.PATCH`.

- **PATCH** (1.0.**1**): xato tuzatish, kichik o'zgarish.
- **MINOR** (1.**1**.0): yangi funksiya.
- **MAJOR** (**2**.0.0): katta, mos kelmaydigan o'zgarish.

Bu versiya foydalanuvchiga do'konda va Profil ekranida ko'rinadi (`app.json` → `expo.version`). Do'kondagi build raqamlarini (Android `versionCode`, iOS `buildNumber`) EAS har production build'da o'zi oshiradi.

## [1.0.2] — 2026-10-20

### Tuzatildi
- Sarlavha endi sahifa bilan birga aylanib ketmaydi, ekran yuqorisida qotib turadi. Tuzatilgan ekranlar: Ovoz, Umumiy, Buzilish va O'rganish bosh sahifasi. Ilgari sarlavha `ScrollView` ichida edi. Endi u alohida, kontent esa uning ostida aylanadi. O'rganish ichki sahifalarida sarlavha avvaldan qotirilgan edi.

## [1.0.1] — 2026-10-20

### Tuzatildi
- Ilova ikonkasi (`assets/icon.png`) alfa-kanalsiz (RGB) qilindi. App Store 1024×1024 ikonkada alfa-kanalni qabul qilmaydi. Logo aniqroq chiqadi.

### Qo'shildi
- `store/` papkasi, do'kon sahifasi uchun:
  - `app-store-icon-1024.png` — App Store ikonkasi (1024×1024, RGB);
  - `play-store-icon-512.png` — Google Play ikonkasi (512×512);
  - `play-feature-graphic-1024x500.png` — Google Play banneri (Feature graphic).

## [1.0.0] — 2026-10-19

Birinchi versiya: do'konlarga chiqarish uchun tayyor.

- Ovozli va matnli savol-javob (texnik bilimlar bazasi). Seriyasi aniq bo'lmagan savolda lokomotiv seriyasi so'raladi.
- Javobni ovozda o'qish (ovoz ▶ bosilganda yaratiladi).
- Nosozlik xabarlari: ovoz, rasm va video bilan.
- O'rganish bo'limi: testlar, ВЛ80с kitobi va taqdimoti, КЛУБ-У, ПТЭ/ИДП/ИСИ hujjatlari.
- PIN-kod qulfi, yorug' va qorong'i mavzu, o'zbek va rus tilidagi interfeys.
- Profil ekranida ilova versiyasi ko'rsatiladi (`app.json` dan olinadi).
- Server: `https://83-69-136-154.sslip.io`.
