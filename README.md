# Modellwerk

Modelling and simulation for the classroom – in the browser, as a desktop app and on
tablets. Students describe a model in sentences, as an influence diagram or as a short
program; Modellwerk runs it step by step and shows graphs and tables.

Modellwerk is an independent new development. It opens files in the PRG format of an
older Windows program and reproduces the values stored in them **bit for bit**.

## Quick start

```bash
npm install
npm run dev          # website with landing page, examples and app (http://localhost:5173)
npm test             # unit tests (Vitest)
npm run build        # website → dist/
npm run build:app    # app only (used by the desktop/mobile shell) → dist-app/
npm run build:single # app as one offline HTML file → dist-single/
npm run tauri build  # desktop app (needs Rust; see "Desktop and mobile")
```

## Site structure

| Path | Content |
|---|---|
| `/` | Landing page |
| `/app/` | The app; `/app/#<example-id>` opens an example directly |
| `/examples/` | Overview of all examples |
| `/examples/<example-id>/` | Bilingual student guide with live graph and tasks |

## Proof of identical results

Every PRG file stores, besides program and initial values, the values the legacy
program calculated for every variable and step (IEEE-754 doubles). The proof run
recalculates each model and compares every stored value bit for bit:

```bash
PRG_REFERENCE_DIR=/path/to/prg-files npm run verify   # report
PRG_REFERENCE_DIR=/path/to/prg-files npm test         # also as test cases
```

Result for the 27 reference files shipped with the legacy program: **29,380 of 29,380
values identical** (21 files contain stored results; 5 use a file variant that is not
read yet). The reference files are copyrighted and are not part of this repository. In
the app, *Compare PRG file* in the footer runs the same check locally.

What we learned about the legacy program:

- Every operation is rounded to an IEEE-754 double (an 80-bit extended re-run differs
  in up to 70 % of the values).
- `exp`, `ln` and `^` are effectively correctly rounded (x87 with 80 bits, then
  stored as double). JavaScript's `Math.exp`, `Math.log` and `Math.pow` are off by one
  ULP in 3–9 % of cases, so `src/engine/exactmath.js` computes them in double-double
  arithmetic and rounds once (tested against 60-digit references).
- Values are recorded after each pass; the initial value is stored separately.

## Modelling language

```
// comment
Growth := FGrowth*Height*(FinalHeight-Height)   // := or = assigns
Height := Height + Growth; Time := Time + 1     // ; or : separates statements
IF Height > 200 THEN Flag := 1; Count := Count + 1   // IF/WHILE apply to the rest of the line
```

Operators `+ - * / ^`, parentheses, comparisons `< > = <= >= <>`, decimal comma or point,
functions `sqr sqrt exp ln sin cos arctan abs int frac random`. `random(0)` gives a
fraction in [0, 1), `random(x)` a whole number from 0 to x−1. Letter case is ignored
unless switched on. At most 8191 steps.

Semantics marked as *documented but not yet verified bit for bit* in
`src/engine/language.js`: `^` precedence (assumed: binds tighter than unary minus,
right-associative), `IF`/`WHILE`, trigonometric functions and `random`.

## Code layout

```
src/engine/      language, simulation, exact maths, PRG reader, verification,
                 model analysis (roles, sentences ↔ program), CSV, project files
src/components/  app components (Vue 3, Options API)
src/guides/      example overview and guide pages
src/site/        shared header, footer, links, theme
src/examples/    example collections (own.json, sourced.json with sources)
src/i18n/        German and English texts
src-tauri/       desktop/mobile shell (app only)
tests/           Vitest
```

Stack: Vite, Vue 3 (Options API), Tailwind CSS 4, Lucide icons, Atkinson Hyperlegible
(self-hosted via Fontsource). No server, no tracking, no third-party requests.

## Accessibility

Labelled buttons instead of icon-only toolbars, full keyboard control, visible focus,
WAI-ARIA tabs, live regions for messages, graph values readable with arrow keys and
announced to screen readers, diagram also as text, colour-blind-safe curve colours
plus dash patterns, light/dark/system theme, adjustable text size, reduced motion.

## Examples

`src/examples/own.json` – written from scratch. `src/examples/sourced.json` – based on
openly licensed or factual sources (mostly Wikipedia, CC BY-SA 4.0, and official data);
every example lists its sources, shown in the app and on the guide pages.
Each example has control values that the test suite checks.

## Desktop and mobile

`src-tauri/` wraps the app (without landing page and guides) with Tauri 2.
GitHub Actions (`.github/workflows/release.yml`) build Windows (`.msi`, `.exe`),
Linux (`.deb`, AppImage) and Android (`.apk`, `.aab`) on a version tag; Android signing
is optional via the secrets `ANDROID_KEYSTORE`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. The app identifier `app.modellwerk.desktop` is a placeholder.

Linux build dependencies: `libwebkit2gtk-4.1-dev librsvg2-dev patchelf`.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
