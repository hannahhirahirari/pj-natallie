# Natallie Native Wrapper

This repo now has a thin Capacitor wrapper for iOS and Android. The existing PWA is still the source app; native builds package a copied version of `app/` instead of loading `natallie.app` at runtime.

## Current Shape

- Capacitor app id: `app.natallie`
- Capacitor app name: `natallie`
- Native web directory: `native/www`
- iOS project: `ios/App`
- Android project: `android`
- React is pinned to `18.3.1` and copied into `native/www/vendor/` for native builds.

`app.natallie` is the practical bundle/package id because Hannah owns `natallie.app`, but it should still be explicitly approved before store submission. Runner-up: `app.natallie.natallie`.

## Commands

Install dependencies once:

```sh
npm install
```

Prepare local native web assets:

```sh
npm run native:prepare-web
```

Sync the prepared assets into iOS and Android:

```sh
npm run native:sync
```

Open native IDEs:

```sh
npm run native:open:ios
npm run native:open:android
```

Build an Android release bundle after signing is configured:

```sh
npm run native:android:bundle
```

## Privacy Guardrails

- Native builds use packaged local files, not the live website.
- The native asset prep rewrites React CDN script tags to local `/vendor/` files.
- No analytics, crash reporting, ads, accounts, sync, Firebase, or Google Services are configured.
- Android `INTERNET` permission is removed.
- Android app backup is disabled with `android:allowBackup="false"` and `android:fullBackupContent="false"` so local app data is not copied into Android backup.

iOS backup behavior still needs a deliberate decision before submission. By default, app container data may be included in a user's device/iCloud backup. For the strongest local-only interpretation, add native code to exclude Natallie's WebKit storage from backup; the trade-off is that users who lose a device must rely on Natallie's manual export/backup files.

## Store Submission Decisions

Hannah should approve these before anything is submitted under her name:

- Apple Developer account and Google Play Console account ownership.
- Final bundle id / package name.
- Signing certificate and key custody.
- App category, age rating, copyright holder, support URL/email, privacy disclosures, and screenshots.
- Store listing copy in English and Japanese.
- Whether native app data should be excluded from iOS backups.

## Store Assets Still Needed

- A true 1024x1024 source icon for App Store Connect. The current iOS marketing icon is upscaled from the existing 512px PWA icon as a temporary starter.
- iPhone, iPad, Android phone, and Android tablet screenshots from native builds.
- Final App Store and Play Store listing text approved by Hannah.
