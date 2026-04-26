# the .natallie file format

natallie is a free local-only event logger built as a progressive web app. the `.natallie` backup file is the durable artifact of the project: a documented JSON format that holds a user's grid, taps, and notes in a way that other tools, including any future viewer, importer, or successor app, can read without depending on natallie itself continuing to run.

## file basics

a `.natallie` file is plain JSON, encoded as UTF-8, with 2-space indentation. the extension is `.natallie`. the MIME type used at download is `application/octet-stream`. the file is created when the user taps "backup" in the app's settings; nothing is uploaded or sent. the suggested filename follows the pattern `natallie-backup-YYYY-MM-DD.natallie`, where the date is taken from the export moment in UTC.

## the top-level structure

every `.natallie` file is a single JSON object with the following top-level fields.

| field | type | description |
| --- | --- | --- |
| `version` | number | format version. currently `1`. |
| `exportedAt` | number | unix milliseconds at the moment of export. |
| `exportedDate` | string | the same moment as a human-readable, locale-dependent string. |
| `timezone` | string | IANA timezone such as `"Asia/Tokyo"`. may be an empty string if the runtime cannot resolve it. |
| `utcOffset` | string | the user's offset at export time, formatted like `"UTC+09:00"`. |
| `appName` | string | the user's display name for their app, default `"natallie"`. |
| `language` | string | the UI language at export. currently `"en"` or `"ja"`. |
| `slots` | array | the user's top-level grid. always 9 entries. |
| `logs` | array | a list of tap events, newest first. |
| `notes` | array | a list of free-text notes, newest first. |
| `boardPins` | object | a map of board id to pin string. may be `{}`. |

a small example showing only the top-level shape:

```json
{
  "version": 1,
  "exportedAt": 1745524320541,
  "exportedDate": "4/24/2026, 3:32:00 PM",
  "timezone": "Asia/Tokyo",
  "utcOffset": "UTC+09:00",
  "appName": "natallie",
  "language": "en",
  "slots": [ ... ],
  "logs": [ ... ],
  "notes": [ ... ],
  "boardPins": {}
}
```

## slots

the `slots` array represents the user's grid. natallie's grid is 3x3, so `slots` always has exactly 9 entries. each entry is an object, and an entry can be either a button (a tappable leaf) or a board (a folder that contains its own 3x3 grid of nine more entries). boards nest, so the structure is recursive.

each slot has the following fields.

| field | type | description |
| --- | --- | --- |
| `id` | string | unique identifier within the file. constructed from the parent id plus an index, joined with `_`. top-level slots are `r_0` through `r_8`. |
| `nm` | string | the display name of the slot. an empty string means the slot has not been configured. |
| `cl` | string | hex color, including the leading `#`, for example `"#FF6B6B"`. an empty string means no color is set. |
| `md` | string | mode. currently always `"click"`. |
| `tp` | string | type. either `"button"` or `"board"`. |
| `ch` | array | children. always `[]` for a button. for a board, an array of nine slot objects. |

an unconfigured slot is `tp: "button"` with `nm: ""` and `cl: ""`. there is no separate "empty" type value. the app distinguishes empty slots from configured buttons by checking whether `nm` is non-empty.

slot ids are stable across exports as long as the slot itself is not deleted and recreated. clearing a slot resets its `nm`, `cl`, and `tp` to defaults but preserves its `id`. a slot whose parent is `r_3` will have children with ids `r_3_0` through `r_3_8`, and so on for any further depth.

a small focused example showing one configured button, one board with one configured child, and one unconfigured slot:

```json
[
  {
    "id": "r_0",
    "nm": "anxiety",
    "cl": "#FF6B6B",
    "md": "click",
    "tp": "button",
    "ch": []
  },
  {
    "id": "r_1",
    "nm": "feelings",
    "cl": "#C3A6FF",
    "md": "click",
    "tp": "board",
    "ch": [
      {
        "id": "r_1_0",
        "nm": "low",
        "cl": "#C3A6FF",
        "md": "click",
        "tp": "button",
        "ch": []
      }
    ]
  },
  {
    "id": "r_2",
    "nm": "",
    "cl": "",
    "md": "click",
    "tp": "button",
    "ch": []
  }
]
```

## logs

each entry in `logs` is one tap of one button. logs are stored newest-first.

| field | type | description |
| --- | --- | --- |
| `id` | number | a per-event identifier formed from `Date.now() + Math.random()`. opaque; treat as a string for deduplication. |
| `bi` | string | the slot id of the tapped button. |
| `en` | string | the event name, equal to the button's `nm` at the moment of the tap. |
| `pa` | string | the path through parent boards down to this button, joined by `" › "` (U+203A, single right-pointing angle quote, with one space on each side). |
| `cl` | string | the button's color at the moment of the tap. |
| `ty` | string | the event type. currently always `"click"`. |
| `ts` | number | the unix-millisecond timestamp of the tap. |
| `date` | string | a human-readable, locale-dependent rendering of `ts`. added at export time only, not present in the live in-memory state. |

`en`, `pa`, and `cl` are snapshots of the button's state at the moment of the tap. if the button is later renamed, recolored, or deleted, the historical log entry retains its original values. logs are self-contained: a deleted button still has a meaningful history.

`ts` is the source of truth for time. `date` exists only as a convenience for users who open the file in a text editor and do not want to convert milliseconds. importers should prefer `ts` and ignore `date` when there is any ambiguity.

a single log entry:

```json
{
  "id": 1745524320541.7234,
  "bi": "r_0",
  "en": "anxiety",
  "pa": "anxiety",
  "cl": "#FF6B6B",
  "ty": "click",
  "ts": 1745524320541,
  "date": "4/24/2026, 3:32:00 PM"
}
```

## notes

each entry in `notes` is one free-text note. notes are independent of the grid: they have no `bi`, no `pa`, and no association with any slot. they are a parallel timeline of written observations, also stored newest-first.

| field | type | description |
| --- | --- | --- |
| `id` | number | per-note identifier in the same form as a log id. |
| `text` | string | the note content as the user typed it. |
| `ts` | number | unix-millisecond timestamp of the note's creation. |
| `date` | string | human-readable rendering of `ts`, added at export time only. |

in the running app, each note is hidden behind a tap-to-reveal control. that masking is a UI behavior, not a data behavior. **the file always contains the plaintext.** notes are not encrypted.

a single note:

```json
{
  "id": 1745524500999.1234,
  "text": "headache started after lunch, lasted till 4ish",
  "ts": 1745524500999,
  "date": "4/24/2026, 3:35:00 PM"
}
```

## board pins

`boardPins` is an object mapping a board's slot `id` to a pin string. when a board has an entry here, the running app requires the pin to open it.

```json
{
  "r_2": "1234",
  "r_5": "9999"
}
```

pins are stored in plaintext. this is deliberate: the file already contains the user's full data in plaintext, and the pin is meaningful only to the running app, where it gates access at the UI layer. an importer should not treat `boardPins` as a security feature. if no boards have pins, `boardPins` is `{}`.

## versioning

`version: 1` is the only currently defined value of the `version` field. the natallie webapp's importer rejects any file with a different `version`.

future format changes should increment `version`. importers in other tools should check `version` first. the safest behavior is to read what is recognized, ignore unknown fields rather than fail, and warn the user if the version is higher than what the importer was written for.

## a complete example

```json
{
  "version": 1,
  "exportedAt": 1745524320541,
  "exportedDate": "4/24/2026, 3:32:00 PM",
  "timezone": "Asia/Tokyo",
  "utcOffset": "UTC+09:00",
  "appName": "natallie",
  "language": "en",
  "slots": [
    {
      "id": "r_0",
      "nm": "anxiety",
      "cl": "#FF6B6B",
      "md": "click",
      "tp": "button",
      "ch": []
    },
    {
      "id": "r_1",
      "nm": "wins",
      "cl": "#F0E68C",
      "md": "click",
      "tp": "button",
      "ch": []
    },
    {
      "id": "r_2",
      "nm": "feelings",
      "cl": "#C3A6FF",
      "md": "click",
      "tp": "board",
      "ch": [
        {
          "id": "r_2_0",
          "nm": "low",
          "cl": "#C3A6FF",
          "md": "click",
          "tp": "button",
          "ch": []
        },
        {
          "id": "r_2_1",
          "nm": "restless",
          "cl": "#FFB347",
          "md": "click",
          "tp": "button",
          "ch": []
        },
        { "id": "r_2_2", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
        { "id": "r_2_3", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
        { "id": "r_2_4", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
        { "id": "r_2_5", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
        { "id": "r_2_6", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
        { "id": "r_2_7", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
        { "id": "r_2_8", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] }
      ]
    },
    { "id": "r_3", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
    { "id": "r_4", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
    { "id": "r_5", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
    { "id": "r_6", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
    { "id": "r_7", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] },
    { "id": "r_8", "nm": "", "cl": "", "md": "click", "tp": "button", "ch": [] }
  ],
  "logs": [
    {
      "id": 1745525000123.5678,
      "bi": "r_2_1",
      "en": "restless",
      "pa": "feelings › restless",
      "cl": "#FFB347",
      "ty": "click",
      "ts": 1745525000123,
      "date": "4/24/2026, 3:43:20 PM"
    },
    {
      "id": 1745524320541.7234,
      "bi": "r_0",
      "en": "anxiety",
      "pa": "anxiety",
      "cl": "#FF6B6B",
      "ty": "click",
      "ts": 1745524320541,
      "date": "4/24/2026, 3:32:00 PM"
    }
  ],
  "notes": [
    {
      "id": 1745524500999.1234,
      "text": "headache started after lunch, lasted till 4ish",
      "ts": 1745524500999,
      "date": "4/24/2026, 3:35:00 PM"
    }
  ],
  "boardPins": {}
}
```

## the standard color palette

the natallie app offers thirteen preset button colors. users can also pick any custom hex color, so importers should not assume `cl` is restricted to this list. it is given here only as reference for tools that want to render slots in the same default scheme.

| name | hex |
| --- | --- |
| coral | `#FF6B6B` |
| pink | `#FF85A1` |
| amber | `#FFB347` |
| peach | `#FFCBA4` |
| butter | `#F0E68C` |
| sage | `#77DD77` |
| mint | `#98E8C1` |
| teal | `#5FABA1` |
| sky | `#7EC8E3` |
| lilac | `#C3A6FF` |
| plum | `#DDA0DD` |
| slate | `#8899AA` |
| blue | `#4A90D9` |

## what an importer needs to do

at minimum, a correct `.natallie` importer should:

1. parse the file as JSON. if parsing fails, reject the file.
2. check `version`. accept `1`. for higher versions, either reject or warn and read what is recognized.
3. confirm `slots` and `logs` are arrays. these are the only required arrays; `notes` and `boardPins` may be missing or empty.
4. walk `slots` recursively, descending into `ch` for any slot where `tp === "board"`. tolerate slot arrays shorter than nine by treating missing slots as unconfigured.
5. read `ts` as the source of truth for log and note timestamps. ignore `date` if it conflicts with `ts`.
6. treat unknown fields as forward-compatible. ignore them rather than reject them.
7. treat `boardPins` as a UI hint, not as encryption.

## what is intentionally not in this format

a `.natallie` file does not contain:

- analytics, telemetry, or any record of how the user interacted with the app outside of their own logs and notes
- a user account, login, session, or remote identifier
- device identifiers, network information, IP address, or anything about the user beyond what they typed into the app
- any field encrypted at rest

these absences are part of the format. a tool that adds any of these fields when writing a `.natallie` file is no longer writing the same format.

## license

this format document is published alongside the natallie source code under the [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/) license. anyone is free to read and write `.natallie` files for noncommercial use, including building a viewer, importer, or successor app. commercial use requires a separate arrangement with the natallie author.
