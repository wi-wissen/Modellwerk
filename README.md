# Modellwerk

Modellbildung und Simulation im Browser – eine moderne, barrierearme Neuentwicklung,
die **rechengleich zu Moebius 3.0** (Detlef Hoche) ist. Arbeitstitel, Stand: Mockup.

## Schnellstart

```bash
npm install
npm run dev            # Entwicklungsserver
npm test               # Unit-Tests
npm run build          # Web-Build nach dist/
npm run build:single   # eine einzige, offline nutzbare HTML-Datei nach dist-single/
```

## Wie beweisen wir „exakt dieselben Ergebnisse“?

Moebius speichert in jeder `.prg`-Datei nicht nur Programm und Startwerte, sondern auch
**die Werte, die es selbst berechnet hat** – für jede Variable und jeden Schritt als
IEEE-754-Double. Damit liegt in jeder Originaldatei ein Referenzergebnis des Originals vor.

Der Prüflauf liest diese Dateien, rechnet jedes Modell mit unserem Rechenkern nach und
vergleicht **jeden Wert Bit für Bit**:

```bash
MOEBIUS_ORIGINAL_DIR="/pfad/zu/Moebius/Beispiele" npm run verify
MOEBIUS_ORIGINAL_DIR="/pfad/zu/Moebius/Beispiele" npm test   # zusätzlich als Testfälle
```

Stand mit den 27 Beispieldateien von Moebius 3.0 (Installer Sachsen und Shareware, identische EXE):

| | |
|---|---|
| Dateien mit gespeicherten Ergebnissen | 21 von 26 |
| verglichene Werte | 29 380 |
| bitgenau identisch | **29 380 (100 %)** |

Dieselbe Prüfung steckt in der App („Mit Original vergleichen“): Lehrkräfte können eigene
`.prg`-Dateien hineinziehen und sehen sofort, ob alles identisch ist. Die Dateien verlassen
dabei das Gerät nicht.

Die Originaldateien sind urheberrechtlich geschützt und liegen deshalb **nicht** im Repository.

### Was wir dabei über das Original gelernt haben

- Das Original rechnet jede Operation in **IEEE-754-Double** (nicht in 80-Bit-Extended).
  Eine Extended-Nachrechnung weicht bei bis zu 70 % der Werte ab; Double trifft alle.
- `exp()` rechnet das Original auf der x87-FPU und rundet dann auf Double – das ist praktisch
  korrekt gerundet. `Math.exp` in JavaScript liegt in ca. 8 % der Fälle 1 ULP daneben.
  Deshalb gibt es `src/engine/exactmath.js` (Double-Double-Arithmetik, gegen eine
  60-stellige Referenz getestet). Erst damit stimmt auch das Kondensator-Beispiel bitgenau.
- Gespeichert werden die Werte **nach** jedem Durchlauf; der Startwert steht separat.

## Aufbau

```
src/engine/language.js   Modellsprache: Tokenizer, Parser (Fehlermeldungen wie im Original)
src/engine/simulate.js   Interpreter, Delphi-kompatibler Zufallsgenerator
src/engine/exactmath.js  korrekt gerundete Elementarfunktionen
src/engine/prg.js        Leser für Moebius-Dateien (MOEBIUS30)
src/engine/verify.js     bitweiser Vergleich mit den Originalergebnissen
src/engine/model.js      Rollen (Zustand/Rate/Konstante/Zeit), Sätze → Programm
src/components/          Vue-Komponenten (Options API)
scripts/                 Prüflauf, Artefakt-Export
tests/                   Vitest
```

Technik: Vite, Vue 3 (Options API), Tailwind CSS 4, Lucide-Icons, Schrift Atkinson Hyperlegible
(vom Braille Institute für gute Lesbarkeit entwickelt). Kurvenfarben nach Okabe-Ito
(farbenblind-sicher) und zusätzlich unterschiedliche Strichmuster.

## Barrierefreiheit (bisher umgesetzt)

- jede Schaltfläche mit Text, nicht nur Symbol; Tastaturbedienung überall, sichtbarer Fokus
- Tabs nach WAI-ARIA (Pfeiltasten), Sprunglink, Live-Regionen für Meldungen
- Diagramm per Tastatur ablesbar (← → Pos1 Ende Bild↑ Bild↓), Werte werden angesagt
- Wirkungsdiagramm zusätzlich als Text
- hell/dunkel/System, Schriftgröße in Stufen, `prefers-reduced-motion`
- Fehlermeldungen mit Zeilennummer und Sprung zur Stelle

## Offene Punkte

1. **Formatvariante:** 5 Beispieldateien (Kepler, Räuber, Elektron im B-Feld, Bewegung 1/3)
   enthalten mehrere Simulationen in einem anderen Satzaufbau. Leser erweitern, dann
   prüfen, ob dort Ergebnisse gespeichert sind.
2. **Sprachumfang verifizieren:** IF/THEN, WHILE/DO, Vergleiche, SIN/COS/ARCTAN/LN/FRAC/INT,
   RANDOM, TIME, INP und Makros sind aus der EXE bekannt, aber noch nicht gegen das
   Original geprüft. Weg: Parser/Interpreter der EXE disassemblieren (Ghidra) und eigene
   Testdateien im Original erzeugen lassen (Moebius unter Windows/Wine).
   Für SIN/COS/LN/ARCTAN korrekt gerundete Versionen wie bei EXP ergänzen.
3. **Namenskollisionen** (z. B. `A` und `a`) beim Eingeben warnen – das Original unterscheidet
   standardmäßig nicht zwischen Groß- und Kleinschreibung.
4. Grafisches Modell zum direkten Zeichnen, Animationen, Arbeitsblatt mit Text und Grafiken,
   Drucken, Speichern im eigenen Format und Export (CSV/Excel).
5. Grenzfall: Bei transzendenten Funktionen kann das Original selbst je nach Prozessor
   (Intel/AMD-x87) in seltenen Fällen um 1 ULP abweichen. Für diese Fälle ist „korrekt gerundet“
   die einzige reproduzierbare Referenz.

## Desktop und Mobil mit Tauri

Die App ist eine reine Client-Anwendung ohne Server und eignet sich damit direkt für
[Tauri 2](https://v2.tauri.app/): `npm create tauri-app` bzw. `npx tauri init` im Projekt,
`frontendDist` auf `../dist` und `devUrl` auf den Vite-Server setzen. Daraus entstehen
Windows-, macOS- und Linux-Installer sowie iOS- und Android-Apps. Voraussetzungen: Rust,
für Mobil zusätzlich Xcode bzw. Android SDK. Alternativ läuft die Web-Version als PWA
offline im Browser.

## Rechtliches

Neuentwicklung der Funktionalität, kein übernommener Code. Beispiele, Texte und Grafiken
sind neu erstellt. Das Lesen von `.prg`-Dateien dient der Interoperabilität.
