# Roadmap

Derived from a comparison with the public documentation of the legacy program.

## Done

- Modelling language incl. `^`, `=`, `:`, IF/WHILE for the rest of the line, `random(x)`
- Sentence-based modelling, lossless program → sentences conversion
- Influence diagram (drawn from the program), enlarge dialog
- Initial values, repeat n times, continue by n steps
- 2D graph with free x axis (phase diagrams), manual axis limits, PNG/SVG export
- Table, CSV export (German separators), copy as tab-separated text
- Open PRG files, compare stored results bit for bit
- Own project format with autosave
- 20 examples with bilingual student guides
- German/English, light/dark, text size, keyboard and screen reader support
- Desktop/mobile shell and release pipeline

## Next (core)

- Editable influence diagram: add stocks, rates, constants and arrows; formula
  dialog with clickable inputs and functions; keyboard operation
- "Extended syntax" for graphical models (helper quantities)
- Verify `^` precedence, IF/WHILE, trigonometric functions and `random` against
  PRG files created with the legacy program

## Next (important)

- Animation: sprite moves along x/y variables, play/pause/speed, traces, own SVG
  sprite pack for typical experiments (ball, cart, spring, pendulum, satellite …)
- 3D graph (x, y, z variables) with rotation, plus 2D projections
- Variants: same program with other initial values overlaid in one graph
- Macros as named, collapsible blocks
- Report/print: program, models, graph, table, initial values
- Curve styles (points, bars), legend options, number formats
- Read the remaining PRG file variant (several simulations per file)

## Later

- Annotations in the graph, inserted images
- Custom predicate wording (e.g. plain language)
