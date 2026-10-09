// Built-in example models.
// OWN: written from scratch; titles and descriptions live in src/i18n under examples.<id>.
// OWN_COLLECTION: our own collection (src/examples/own.json) with built-in texts.
// SOURCED: researched from openly licensed or factual sources, see src/examples/SOURCES.md;
//          they carry their own texts and source list.
// Program text and variable names are learner-facing content and stay German.
import OWN_COLLECTION from './examples/own.json' with { type: 'json' }
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
    subject: { de: 'Biologie / Mathematik', en: 'Biology / Mathematics' },
    level: { de: 'Klasse 7–10', en: 'Grades 7–10' },
  },
]

export const EXAMPLES = [...OWN, ...OWN_COLLECTION, ...SOURCED]
