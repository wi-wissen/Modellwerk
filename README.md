# Modellwerk

Modelling and simulation for the classroom – in the browser, as a desktop app and on
tablets. Students describe a model in sentences, draw it as an influence diagram or
write a short program; Modellwerk runs it step by step and shows graphs, 3D graphs,
tables and animations, and prints a report.

Modellwerk is compatible with [Moebius 3.0](https://www.hoche-bw.de/moebius/index.php)
by Detlef Hoche: it opens Moebius PRG files and reproduces the values stored in them
**bit for bit**. Modellwerk is an independent new development; it is not part of, not
endorsed by and not affiliated with Moebius or its author. Moebius is named here only
to describe this compatibility. The app itself shows no third-party name.

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

Results:

- **26 example files shipped with the legacy program** (all file variants, including
  several simulations per file): **52,720 of 52,720 values identical**.
- **Own test programs run in the legacy program** (under Wine, saved with results):
  all functions 2,400/2,400, powers and unary minus 720/720, IF/WHILE 240/240,
  `random` 200/200 (with the recovered seed, `PRG_SEED=2232077016`). These runs are
  also a fixture in `tests/legacy-runs.test.js`, so they are checked on every `npm test`.

The reference files are copyrighted and are not part of this repository. In the app,
*Compare PRG file* in the footer runs the same check locally; files saved without a
run are reported as having nothing to compare.

What we learned about the legacy program:

- Every operation is rounded to an IEEE-754 double (an 80-bit extended re-run differs
  in up to 70 % of the values).
- `exp`, `ln` and `^` are correctly rounded. JavaScript's `Math.exp`, `Math.log` and
  `Math.pow` are off by one ULP in 3–9 % of cases, so `src/engine/exactmath.js`
  computes them in double-double arithmetic and rounds once (tested against
  60-digit references).
- `sin` and `cos` behave like the x87 `FSIN`/`FCOS`: the argument is reduced with a
  66-bit π/2, the result is rounded to 64-bit extended and then to double (double
  rounding). `arctan` is the true value rounded the same way.
- `random` is Delphi's linear congruential generator (multiplier `0x08088405`) seeded
  from the clock; Modellwerk stores the seed so runs can be repeated.
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

Verified against the legacy program: unary minus binds tighter than `^`
(`-2^2 = 4`), `^` is left-associative (`2^3^2 = 64`), a negative base with a
fractional exponent stops the run with an error. Program blocks (macros) are called by
writing their name as a statement.

## Code layout

```
src/engine/      language, simulation, exact maths, PRG reader, verification,
                 model analysis (roles, sentences ↔ program), graph model
                 (diagram ↔ program), animation, CSV, project files
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

## Website, releases and apps

The website is published at <https://modellwerk.wi7.net> by GitHub Pages
(`.github/workflows/pages.yml`, on every push to `main`; Settings → Pages → Source:
GitHub Actions, custom domain modellwerk.wi7.net).

`src-tauri/` wraps the app (without landing page and guides) with Tauri 2; the app
identifier is `net.wi7.modellwerk`, derived from the domain. To build a release:

1. Set `version` in `package.json` and `src-tauri/tauri.conf.json` (e.g. `0.2.0`).
2. Commit, then push a tag: `git tag v0.2.0 && git push origin v0.2.0`.
3. `.github/workflows/release.yml` builds Windows (`.msi`, setup `.exe`), Linux
   (`.deb`, AppImage), Android (`.apk`, `.aab`) and the offline HTML file and puts
   them into a **draft** release. Check it under Releases and publish it.

The workflow can also be started by hand (Actions → Release apps → Run workflow);
the files are then only attached to the run as artifacts.

Android signing is optional via the secrets `ANDROID_KEYSTORE` (base64 of the
keystore), `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`; without them the APK is
unsigned (fine for testing, not for the Play Store). Windows installers are not
code-signed, so Windows SmartScreen asks once before the first start.

Linux build dependencies: `libwebkit2gtk-4.1-dev librsvg2-dev patchelf`.

## Features

- Modelling in sentences (wording of the building blocks adjustable, like the
  legacy predicate file), as an editable influence diagram (stocks, rates,
  constants, flows between rates and stocks, influence arrows; extended syntax with
  helper quantities) or as a program; a model without conditions whose flows are
  named quantities converts losslessly between the three (all 12 such examples do)
- Modelling language incl. `^`, `=`, `:`, IF/WHILE for the rest of the line,
  `random(x)` with a stored seed, macros (program blocks)
- Projects with several simulations (copies, variants with other initial values),
  overlaid in one graph; undo/redo for every change
- 2D graph with free x axis (phase diagrams), manual axis limits, curve styles
  (colour, line, width, points, bars), text labels in the graph, PNG/SVG export
- 3D graph with rotation; animation with an own sprite pack (gauges, ropes,
  springs, growing pictures); table with CSV export
- Printable report with description, diagram, program, initial values, graph and
  table
- PRG files: open all file variants including x axis, shown curves, curve styles
  per simulation, axis ranges and text labels; compare stored results bit for bit
- 20 examples with bilingual student guides; German/English, light/dark, text size,
  keyboard and screen reader support; works offline and as desktop/mobile app
