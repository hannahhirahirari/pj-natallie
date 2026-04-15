# natallie — Code Explained for Beginners

This walks through every section of `index.html` so you can understand what each part does. The entire app is one HTML file — no build tools, no frameworks to install.

---

## 1. The HTML Shell (lines 1-22)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- Makes the app fill the whole phone screen properly -->
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,
        user-scalable=no,viewport-fit=cover">

  <!-- Makes the phone's status bar match our dark background -->
  <meta name="theme-color" content="#111113">

  <!-- These two lines make it work as an "installed" app on iPhone -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <!-- Links to the PWA manifest (app name, icons, etc.) -->
  <link rel="manifest" href="/manifest.json">

  <!-- App icons for browser tab and home screen -->
  <link rel="icon" href="/icon-192.png">
  <link rel="apple-touch-icon" href="/icon-192.png">

  <title>natallie</title>
</head>
```

**What's a PWA?** A Progressive Web App. It's a website that can be "installed" on your phone's home screen and behaves like a native app. The manifest.json file tells the phone what to call it and what icon to use.

---

## 2. CSS Styles (lines 13-18)

```css
/* Reset all default spacing browsers add */
* { margin: 0; padding: 0; box-sizing: border-box }

/* Make the app fill the whole screen with our dark background */
html, body, #root { height: 100%; background: #111113; overflow-x: hidden }

/* Use Apple's system font so it looks native */
body { font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif }

/* Two animations used when you press a button: */

/* ripPop: a circle that expands outward and fades — the "ripple" effect */
@keyframes ripPop {
  0%   { transform: scale(0.3); opacity: 0.6 }   /* starts small and visible */
  100% { transform: scale(2.5); opacity: 0 }      /* grows big and disappears */
}

/* bnce: the button bounces back after being pressed */
@keyframes bnce {
  0%   { transform: scale(0.85) }  /* starts squished (from your press) */
  50%  { transform: scale(1.06) }  /* overshoots slightly bigger than normal */
  100% { transform: scale(1) }     /* settles back to normal size */
}
```

---

## 3. Loading React (lines 21-23)

```html
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

- `<div id="root">` is the empty container where React will put all our UI
- The two scripts load React from a CDN (a public server that hosts popular libraries)
- React is a library that makes building interactive UIs easier — instead of manually finding and updating elements on the page, you describe what the screen should look like and React figures out what to change

---

## 4. Constants & Helper Functions

```javascript
// React.createElement is how you create UI elements without JSX
// Instead of writing <div className="foo">Hello</div>
// You write: e("div", {className: "foo"}, "Hello")
var e = React.createElement;

// Our color palette — these are the preset swatches in the color picker
var COLORS = ["#FF6B6B", "#FFB347", "#77DD77", ...];

// Theme colors used throughout the app
var BG = "#111113";   // Background (almost black)
var SF = "#1C1C1F";   // Surface (slightly lighter, used for cards)
var TX = "#E8E8EC";   // Text (off-white)
var DM = "#8888A0";   // Dim text (gray, used for labels)
var MX = 8;           // Maximum items per screen
```

### Haptic Feedback
```javascript
// Makes the phone vibrate when you press buttons
// "heavy" = strong buzz for long-press, "click" = light triple-tap
function hap(s) {
  navigator.vibrate(s === "heavy" ? [30,30,40] : s === "click" ? [15,25,15] : 12);
}
```

### LocalStorage (Saving Data)
```javascript
// localStorage is a simple key-value store built into every browser
// It survives closing the app, restarting the phone, etc.

// Load JSON data from localStorage
function ld(key, fallback) {
  var value = localStorage.getItem(key);   // get the raw string
  return value ? JSON.parse(value) : fallback;  // parse it back into an object
}

// Save JSON data to localStorage
function sv(key, value) {
  localStorage.setItem(key, JSON.stringify(value));  // convert object to string
}

// Save/load plain strings (used for pin, app name)
function svs(key, value) { localStorage.setItem(key, value) }
function lds(key, fallback) { return localStorage.getItem(key) || fallback }

// Delete a key
function rms(key) { localStorage.removeItem(key) }
```

### Statistics Calculator
```javascript
// Given all logs and a list of button IDs, calculate stats
function gSt(logs, ids) {
  // Filter logs to only those matching our button IDs
  var bl = logs.filter(function(l) { return ids.indexOf(l.bi) >= 0 });

  // Count events today (since midnight)
  var ts = new Date(); ts.setHours(0,0,0,0);
  var today = bl.filter(function(l) { return l.ts >= ts.getTime() }).length;

  // Count events this week (last 7 days)
  var weekly = bl.filter(function(l) { return l.ts >= Date.now() - 7*86400000 }).length;

  // Daily average = total events / number of days tracking
  var first = Math.min(...bl.map(function(l) { return l.ts }));
  var days = Math.max(1, Math.ceil((Date.now() - first) / 86400000));
  var avg = (bl.length / days).toFixed(1);

  // Trend arrow: compare this week to previous week
  // ↑ means more this week, ↓ means fewer
  return { today, avg, weekly, monthly, yearly, trend, total: bl.length };
}
```

### Data Structure
```javascript
// Each button/board is an object like this:
{
  id: "r_0",        // unique identifier
  nm: "Anxiety",    // name (empty string = empty slot)
  cl: "#FF6B6B",    // color (hex)
  tp: "button",     // type: "button" or "board"
  ch: [],           // children (only used by boards)
  md: "click"       // mode (always "click" in v1)
}

// Each log entry looks like:
{
  id: 1713200000,          // unique ID (timestamp + random)
  bi: "r_0",               // button ID that was clicked
  en: "Anxiety",           // event name
  pa: "Mental › Anxiety",  // full path (board › button)
  cl: "#FF6B6B",           // color
  ty: "click",             // type
  ts: 1713200000           // timestamp in milliseconds
}
```

### CSV Export
```javascript
// Converts log entries into a CSV file (spreadsheet format)
function gCSV(logs) {
  var header = "timestamp_utc,timestamp_local,event_name,path,event_type,color\n";
  return header + logs.map(function(l) {
    var d = new Date(l.ts);
    return [
      d.toISOString(),           // "2026-04-15T12:30:00.000Z"
      '"' + d.toLocaleString() + '"',  // "4/15/2026, 12:30:00 PM"
      '"' + l.en + '"',          // "Anxiety"
      '"' + l.pa + '"',          // "Mental › Anxiety"
      l.ty,                      // "click"
      l.cl                       // "#FF6B6B"
    ].join(",");
  }).join("\n");
}
```

---

## 5. PinScreen Component

This is the lock screen. It handles three modes:
- **"set"**: First time — user picks a 4-digit pin
- **"confirm"**: User re-enters the pin to make sure they typed it right
- **"enter"**: Returning user enters their existing pin

The pin is stored as a plain string in localStorage under the key `"nat-pin"`.

The keypad is a 3x4 grid of circular buttons (1-9, empty, 0, delete).

---

## 6. PinGate Component

This is a **wrapper** — it sits around the entire app and decides whether to show the pin screen or the actual app.

```javascript
function PinGate(props) {
  // Has the user ever seen the pin setup screen?
  var needsSetup = !lds("nat-ps", "");
  // Did they actually set a pin?
  var hasPin = !!lds("nat-pin", "");

  // Start unlocked only if they've been here before AND have no pin
  var unlocked = useState(function() { return !needsSetup && !hasPin });

  // If locked, show pin screen. Otherwise, show the app (props.children)
  if (!unlocked) return e(PinScreen, { ... });
  return props.children;
}
```

**Why a wrapper?** React has a rule: hooks (like useState) must be called in the same order every time a component renders. If we put the pin check inside the main app and returned early, hooks would get called in different orders and React would crash. The wrapper avoids this entirely — the main app only exists after you're past the pin.

---

## 7. ColorPicker Component

Shows 12 preset color swatches. Tapping "Custom" reveals:
- A **hue slider** (rainbow gradient) — drag to pick a base color
- A **shade grid** — 15 variations of that hue (light to dark, vivid to muted)
- A **preview dot** showing the current color with its hex code

The `hsl2hex` function converts HSL (Hue, Saturation, Lightness) values to hex color codes like "#FF6B6B".

---

## 8. ClickBtn Component (The Main Button)

This is the core interaction — the satisfying press:

```javascript
// Track whether the button is currently being pressed
var pr = useState(false);
// Track ripple animation (stores timestamp to force re-render)
var rip = useState(0);
// Timer for detecting long-press vs short tap
var tm = useRef(null);

// When finger goes DOWN:
onPointerDown: function() {
  setPr(true);           // visually press the button
  hap();                 // small vibration
  tm.current = setTimeout(function() {
    hap("heavy");        // big vibration if held 600ms
    tm.current = null;   // mark as long-press
  }, 600);
}

// When finger comes UP:
onPointerUp: function() {
  setPr(false);          // visually release
  if (tm.current) {      // timer still running = short tap (not long press)
    clearTimeout(tm.current);
    hap("click");        // satisfying click vibration
    props.onLog(b, "click");  // record the event
    setRip(Date.now());  // trigger ripple animation
  }
}
```

The button visually:
- **Scales to 85%** when pressed (squish effect)
- **Bounces back** with overshoot animation when released
- **Ripple pulse** expands outward from center on release
- **Inner shadow** appears when pressed (like pushing a physical button in)

---

## 9. BoardTile Component

Similar to ClickBtn but for boards (folders). Shows a 2x2 mini-grid of colored dots representing the first 4 items inside the board. Tapping opens the board to see its contents.

---

## 10. NodeSetup Component

The edit screen for configuring a button or board:
- **Type selector**: Button or Board
- **Name input**: Text field
- **Color picker**: The CPick component
- **Save/Clear buttons**

When you save, it creates/updates the node object and passes it back up to the parent.

---

## 11. CtxMenu & MoveModal Components

**CtxMenu** (Context Menu): Appears when you long-press an item in Setup. Shows options: Edit, Move to…, Delete.

**MoveModal**: When you tap "Move to…", this shows a list of all boards in the app. Tap one to move the item there. The `allBoards` function walks the entire tree of slots to find every board.

---

## 12. MainApp Component

This is the big one — the actual app logic.

### State (all the data the app tracks):
```javascript
slots     // The 8 root-level items (buttons and boards)
logs      // Every tap event ever recorded
nav       // Navigation stack (which boards you've drilled into)
mode      // "click" (main screen) or "setup" (editing screen)
ed        // Which node is currently being edited (null = none)
vl        // Which node's logs are being viewed (null = none)
appNm     // Custom app name (default: "natallie")
ctx       // Which node has the context menu open (null = none)
mvNode    // Which node is being moved (null = none)
showSet   // Whether Settings screen is showing
```

### Key Functions:
```javascript
setSlots(v)       // Update buttons/boards AND save to localStorage
setLogs(fn)       // Update logs AND save to localStorage
doLog(button)     // Record a button tap with timestamp and path
doExp(ids)        // Generate CSV and trigger download
saveNode(updated) // Save an edited node back into the tree
openB(board)      // Navigate into a board
goBack()          // Navigate back one level
handleDel(node)   // Delete a node (clear its data)
handleMove(node, targetId)  // Move a node to a different board
```

### The Render Logic:
The app checks conditions in order and shows the first matching screen:
1. **Settings?** → Show settings (pin management, reset)
2. **Viewing logs?** → Show log history with stats
3. **Editing?** → Show NodeSetup form
4. **Setup mode?** → Show list of all items with long-press support
5. **Default** → Show the main button grid (clicking mode)

---

## 13. Mounting the App

```javascript
// Create the app: PinGate wraps MainApp
// PinGate handles the lock screen, then renders MainApp inside it
ReactDOM.createRoot(document.getElementById("root")).render(
  e(PinGate, null, e(MainApp))
);

// Register the service worker for offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

---

## 14. Other Files

### manifest.json
Tells the phone how to "install" the app: its name, icon paths, background color, and that it should run in standalone mode (no browser chrome).

### sw.js (Service Worker)
A script that runs in the background and caches the app files. After the first load, the app works completely offline. When a new version is deployed, the service worker detects the change and updates the cache.

### icon-192.png / icon-512.png
The app icon (blue "n" on dark background) in two sizes — 192px for Android home screens, 512px for splash screens.

---

## How Data Flows

```
User taps button
    → ClickBtn fires onLog
    → MainApp.doLog() creates a log entry with timestamp
    → Log is added to the logs array
    → logs array is saved to localStorage
    → UI updates to show new count in the pill at the bottom

User exports CSV
    → doExp() filters logs by button/board IDs
    → gCSV() converts logs to CSV text
    → Browser creates a downloadable file
    → File appears in Downloads folder
```

---

## Key Concepts for Beginners

**React.createElement**: Since we don't use a build tool, we can't write JSX (`<div>Hello</div>`). Instead we use `e("div", {props}, "Hello")`. It's the same thing, just uglier.

**useState**: Creates a piece of data that, when changed, causes the screen to update. Like a variable that automatically redraws the UI.

**useRef**: Creates a value that persists between renders but does NOT cause a re-render when changed. Used for timers and DOM references.

**useCallback**: Creates a function that only gets recreated when its dependencies change. Optimization for performance.

**localStorage**: Browser's built-in storage. Survives closing the app. Key-value pairs only, stores strings.

**Service Worker**: A background script that intercepts network requests. We use it to cache files so the app works offline.

**PWA (Progressive Web App)**: A website that can be installed on your phone's home screen and feels like a native app.
