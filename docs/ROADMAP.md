# Roadmap

Derived from a comparison with the public documentation of the legacy program.

## Done

- Modelling language incl. `^`, `=`, `:`, IF/WHILE for the rest of the line,
  `random(x)` with a stored seed; semantics verified against the legacy program
- Results bit-identical to the legacy program (52,720 stored values in 26 example
  files, plus own test programs for functions, powers, IF/WHILE and `random`)
- Sentence-based modelling, lossless program → sentences conversion
- Editable influence diagram (stocks, rates, constants, flows, influence arrows,
  formula panel with clickable inputs and functions, keyboard operation, problem
  list), extended syntax with helper quantities, lossless program → diagram conversion
- Macros (program blocks): create from selected lines, expand, edit
- Projects with several simulations (copies, variants with other initial values),
  overlaid in one graph with a legend
- Initial values, repeat n times, continue by n steps
- 2D graph with free x axis (phase diagrams), manual axis limits, line/points
  styles, curve chips with a preview line, PNG/SVG export
- 3D graph (x, y, z) with rotation
- Animation with an own SVG sprite pack (ball, cart, spring, pendulum, rocket,
  satellite, animals …), traces, play/pause/speed, keyboard control
- Table, CSV export (German separators), copy as tab-separated text
- Printable report: description, program, macros, initial values, graph with
  legend, table
- Open PRG files (all file variants), compare stored results bit for bit
- Own project format with autosave
- 20 examples with bilingual student guides
- German/English, light/dark, text size, keyboard and screen reader support
- Desktop/mobile shell and release pipeline

## Also done

- Undo/redo for all model changes; diagram nodes never overlap; compact tool
  choice on phones
- Animation: a scene for every example (gauges, ropes, springs, growing
  pictures), manual range
- PRG files: stored x axis and shown curves are used
- Report with the influence diagram; website works offline and is installable

## Next

- Read curve colours from PRG files (their encoding is not understood yet)

## Later

- Annotations in the graph
- Custom predicate wording (e.g. plain language)
