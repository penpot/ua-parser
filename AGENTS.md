# UAParser.js — Agent Guide

## Entry point
- `.` → `./src/index.js` (ESM, named exports)

## Public API

```js
import { parse, is, toString, BROWSER, CPU, DEVICE, ENGINE, OS } from '@penpot/ua-parser';
```

### `parse(ua?, extensions?)`
Returns a `ParseResult` with methods:
- `getBrowser()` → `{ name, version, major, type }`
- `getCPU()` → `{ architecture }`
- `getDevice()` → `{ type, model, vendor }`
- `getEngine()` → `{ name, version }`
- `getOS()` → `{ name, version }`
- `getAll()` → `{ ua, browser, cpu, device, engine, os }`
- `getUA()` → raw UA string

### `is(data, str)`
Case-insensitive matching across all properties of a data object (ignores version/major for browser/engine/os, strips trailing `Browser`/`OS` suffixes).

### `toString(data)`
Concatenates significant properties (e.g. `"Chrome 120.0"`, `"Nokia Lumia 635"`).

### Enum objects
`BROWSER`, `CPU`, `DEVICE`, `ENGINE`, `OS` — frozen maps of `NAME`, `VERSION`, etc. to their string values.

## Commands

| Command | What it does |
|---|---|
| `npm test` | `node --test test/unit/` — runs all tests via `node:test` |

No build step, no linters, no dist files.

## Test structure
- `test/unit/parser.test.js` — 4491 tests using `node:test` + `node:assert`
- Fixture data in `test/data/ua/` — split by category (browser, cpu, device, engine, os) as JSON files
- Extension test data in `test/data/ua/extension/`

## Project structure
- `src/index.js` — single-file core library (~1144 lines, ESM)
- `test/unit/` — `node:test` test suite
- `test/data/ua/` — JSON fixtures for all categories and extensions

## Style notes
- ES module (`"type": "module"` in package.json, no CJS)
- Named exports only, no `default export`
- `parse()` is the sole entry point — no `new`, no `setUA`, no `useExtension`
- Helper functions use `function name()` declarations (not `var fn = function()`)
- All constants are individual `const` declarations
- Device type **never** yields `"desktop"` — that must be inferred by the consumer
