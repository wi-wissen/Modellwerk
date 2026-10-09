// Built-in example models.
// OWN: written from scratch; titles and descriptions live in src/i18n under examples.<id>.
// SOURCED: researched from openly licensed or factual sources, see src/examples/SOURCES.md;
//          they carry their own texts and source list.
// Program text and variable names are learner-facing content and stay German.
import SOURCED from './examples/sourced.json' with { type: 'json' }

const OWN = [
  {
    id: 'sunflower',
    mode: 'sentences',
    simplified: true,
    sentences: [
      { subject: 'Wachstum', predicate: 'proportional', object: 'Hoehe*(Endhoehe-Hoehe)' },
      { subject: 'Hoehe', predicate: 'increase', object: 'Wachstum' },
    ],
    start: { HOEHE: 8, ENDHOEHE: 250, FWACHSTUM: 0.0009, ZEIT: 0 },
    steps: 70,
    plot: { x: 'ZEIT', y: ['HOEHE', 'WACHSTUM'] },
  },
  {
    id: 'capacitor-discharge',
    mode: 'program',
    source: `// Entladung eines Kondensators über einen Widerstand
U := Q/C
I := U/R
DeltaQ := I*DeltaT
Q := Q - DeltaQ
t := t + DeltaT
// exakte Lösung zum Vergleich
Qexakt := Q0*exp(-t/(R*C))`,
    start: { Q: 0.00423, Q0: 0.00423, C: 0.00047, R: 2200, DELTAT: 0.05, T: 0 },
    steps: 100,
    plot: { x: 'T', y: ['Q', 'QEXAKT'] },
  },
]

export const EXAMPLES = [...OWN, ...SOURCED]
