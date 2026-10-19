#!/usr/bin/env node
/**
 * Ilova versiyasini oshiradi — app.json (expo.version) va package.json bir xil bo'lib turadi.
 *
 *   npm run version:patch   1.0.1 -> 1.0.2   xato tuzatish, kichik o'zgarish
 *   npm run version:minor   1.0.2 -> 1.1.0   yangi funksiya
 *   npm run version:major   1.1.0 -> 2.0.0   katta o'zgarish
 *
 * Do'kondagi build raqamlari (Android versionCode, iOS buildNumber) bu yerda emas —
 * ularni EAS har production build'da o'zi oshiradi (eas.json: appVersionSource remote, autoIncrement).
 */
const fs = require('fs');
const path = require('path');

const level = process.argv[2];
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error('Foydalanish: node scripts/bump-version.js patch|minor|major');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const appPath = path.join(root, 'app.json');
const pkgPath = path.join(root, 'package.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const current = app.expo.version;
const [major, minor, patch] = current.split('.').map(Number);
const next =
  level === 'major' ? `${major + 1}.0.0` : level === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

app.expo.version = next;
pkg.version = next;
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Versiya: ${current} -> ${next}`);
console.log(`Endi: CHANGELOG.md ga "## [${next}]" bo'limini yozing, keyin:`);
console.log(`  git commit -am "v${next}: ..." && git tag v${next} && git push --follow-tags`);
