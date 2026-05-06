# Native Environment Setup

Last verified: 2026-05-06

This project is a Capacitor native wrapper around the Natallie web app. The source web app lives in `app/`; native builds copy a prepared offline bundle into Android and iOS.

## Project Shape

- Capacitor app id: `app.natallie`
- Android project: `android/`
- iOS project: `ios/App/`
- Generated native web bundle: `native/www/`
- Packaged Android web assets: `android/app/src/main/assets/public/`
- Packaged iOS web assets: `ios/App/App/public/`

Generated web assets and build outputs are intentionally ignored by Git. Commit the native project source files, not `native/www/`, `android/app/build/`, `ios/App/App/public/`, or `build/`.

## Required Tools

Install these once on the Mac:

- Homebrew
- Node.js and npm
- Android Studio, including Android SDK, platform-tools, emulator, and at least one Android Virtual Device
- Xcode, including iOS Simulator

This repo uses Capacitor `8.3.1`. Its Android module compiles with Java 21, so use JDK 21 for Android builds. Android Studio includes a compatible bundled JDK at:

```sh
/Applications/Android Studio.app/Contents/jbr/Contents/Home
```

The repo already points Gradle at that JDK in `android/gradle.properties`.

## Official References

- Android Studio install: https://developer.android.com/studio/install
- Android Java/JDK build docs: https://developer.android.com/build/jdks
- Android Gradle Plugin compatibility: https://developer.android.com/build/releases/about-agp
- Xcode system requirements: https://developer.apple.com/xcode/system-requirements/
- Xcode support/download info: https://developer.apple.com/support/xcode/

## Install Base Command-Line Tools

From a terminal:

```sh
brew install node
node -v
npm -v
npx -v
```

Optional, but useful if you want a global Java outside Android Studio:

```sh
brew install openjdk@21
```

The project build scripts already default to Android Studio's bundled JDK 21, so a global Java install is not required for the normal npm Android commands.

## First-Time Project Setup

From the repo root:

```sh
cd /Users/celia/Projects/Natallie/pj-natallie
npm install
```

Prepare and sync native web assets:

```sh
npm run native:sync
```

This command:

1. Rebuilds `native/www/` from `app/`.
2. Copies local React vendor files into `native/www/vendor/`.
3. Copies the prepared bundle into Android.
4. Copies the prepared bundle into iOS.
5. Updates Capacitor native config files.

Run `npm run native:sync` whenever you change the web app or Capacitor config before building native apps.

## Android Setup

Install Android Studio from the official Android Developers site:

```text
https://developer.android.com/studio
```

Choose the Mac Apple Silicon build if this is an Apple Silicon Mac.

After installing:

1. Open Android Studio.
2. Complete the setup wizard.
3. Install the recommended Android SDK.
4. Install Android SDK Platform-Tools.
5. Install Android Emulator.
6. Create an Android Virtual Device from `Tools` -> `Device Manager`.

Recommended emulator:

- Device: Pixel 8, Pixel 9, Pixel 10, or similar
- System image: latest stable Google APIs image
- ABI: ARM64 / Apple Silicon image when available

Add Android SDK tools to your shell if they are not already available:

```sh
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```sh
adb version
emulator -list-avds
```

## Build Android Debug APK

From the repo root:

```sh
cd /Users/celia/Projects/Natallie/pj-natallie
npm run native:android:debug
```

The debug APK is created at:

```sh
android/app/build/outputs/apk/debug/app-debug.apk
```

## Run Android In The Emulator

Start the emulator from Android Studio:

```text
Tools -> Device Manager -> Play button next to the virtual device
```

Or start it from the terminal. Replace `Pixel_10` with the name from `emulator -list-avds`:

```sh
emulator -avd Pixel_10
```

Wait until the Android home screen is fully booted, then check that ADB can see it:

```sh
adb devices
```

Expected output should include something like:

```text
emulator-5554    device
```

Install and launch the app:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p app.natallie 1
```

If `adb` says `no devices/emulators found`, the emulator is not running or is not fully booted. Start it from Android Studio's Device Manager, wait for the home screen, then run `adb devices` again.

## Build Android Release Bundle

For a Play Store style release bundle:

```sh
npm run native:android:bundle
```

This creates an Android App Bundle under:

```sh
android/app/build/outputs/bundle/release/
```

Release signing must be configured before this bundle is ready for Google Play.

## iOS Setup

Install Xcode from the Mac App Store or Apple Developer downloads:

```text
https://developer.apple.com/support/xcode/
```

After installing Xcode:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
xcodebuild -version
```

Open Xcode once manually and accept any license or component prompts.

The current iOS project uses Swift Package Manager through Capacitor, not CocoaPods. CocoaPods is optional unless future plugins require it.

Optional CocoaPods install:

```sh
brew install cocoapods
pod --version
```

## Open And Run iOS In Simulator

From the repo root:

```sh
cd /Users/celia/Projects/Natallie/pj-natallie
npm run native:sync
npm run native:open:ios
```

In Xcode:

1. Select the `App` scheme.
2. Select an iPhone simulator.
3. Press Run.

The app should show the Natallie PIN/setup screen.

## Build iOS From Terminal

This is useful for verification without using the Xcode UI:

```sh
cd /Users/celia/Projects/Natallie/pj-natallie
npm run native:sync
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath build/ios-sim \
  build
```

Install and launch on a booted simulator:

```sh
xcrun simctl install booted build/ios-sim/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch --terminate-running-process booted app.natallie
```

If your simulator has a different name, list available simulators:

```sh
xcrun simctl list devices
```

## Common Troubleshooting

### Android: `invalid source release: 21`

Capacitor Android 8 compiles with Java 21. Use the npm scripts in this repo:

```sh
npm run native:android:debug
```

They default `JAVA_HOME` to Android Studio's bundled JDK 21. If running Gradle manually, use:

```sh
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
```

### Android: `adb: no devices/emulators found`

Start an emulator first:

```sh
emulator -list-avds
emulator -avd Pixel_10
```

Then wait for the Android home screen and check:

```sh
adb devices
```

### iOS: blank screen in simulator

Run a fresh native sync:

```sh
npm run native:sync
```

This repo's native web preparation writes the real app HTML directly to the native root `index.html` and disables service-worker registration in the native WKWebView. That avoids the iOS pre-paint redirect blank-screen issue.

Then run again from Xcode:

```sh
npm run native:open:ios
```

### iOS: Xcode cannot resolve packages

Try opening Xcode once and letting it resolve Swift packages. From terminal:

```sh
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
```

If Xcode was just installed or updated, also run:

```sh
sudo xcodebuild -runFirstLaunch
```

## Normal Development Loop

For web/app changes:

```sh
npm run native:sync
```

Then build or run the target platform:

```sh
npm run native:android:debug
npm run native:open:ios
```

For Android emulator install:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p app.natallie 1
```

For iOS, run from Xcode after `npm run native:sync`.
