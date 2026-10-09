// Modellwerk project files (*.modellwerk.json): an open, human-readable format.
// A project holds one or more simulations (different programs, copies or variants
// with other initial values) and the shared display settings.
export const PROJECT_FORMAT = 'modellwerk'
export const PROJECT_VERSION = 2
export const PROJECT_EXTENSION = '.modellwerk.json'

const SIMULATION_KEYS = [
  'name', 'example', 'simplified', 'sentences', 'origin', 'source', 'start', 'steps',
  'caseSensitive', 'timeName', 'dtName', 'macros', 'seed', 'graph',
]

const projectError = (code, message) => Object.assign(new Error(message), { code })

/** Serialises a project: { title, simulations, active, view }. */
export function toProject({ title = '', simulations, active = 0, view = {} }) {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    title,
    active,
    simulations: simulations.map((sim) => Object.fromEntries(SIMULATION_KEYS.filter((k) => sim[k] !== undefined).map((k) => [k, sim[k]]))),
    view,
  }
}

export function projectToText(project) {
  return JSON.stringify(project, null, 2) + '\n'
}

const finite = (x) => typeof x === 'number' && Number.isFinite(x)
const text = (x, fallback = '') => (typeof x === 'string' ? x : fallback)

/** Validates one simulation, dropping invalid values instead of failing. */
export function cleanSimulation(m = {}) {
  return {
    name: text(m.name ?? m.title),
    example: typeof m.example === 'string' ? m.example : null,
    simplified: m.simplified !== false,
    sentences: Array.isArray(m.sentences)
      ? m.sentences.filter((s) => s && typeof s.subject === 'string').map((s) => ({ subject: s.subject, predicate: String(s.predicate), object: String(s.object ?? '') }))
      : [],
    origin: ['sentences', 'graph'].includes(m.origin) ? m.origin : 'program',
    source: text(m.source),
    start: Object.fromEntries(Object.entries(m.start ?? {}).filter(([, v]) => finite(v))),
    steps: Number.isInteger(m.steps) && m.steps > 0 ? m.steps : 100,
    caseSensitive: m.caseSensitive === true,
    timeName: text(m.timeName, 'Zeit'),
    dtName: text(m.dtName, 'DeltaT'),
    macros: Array.isArray(m.macros)
      ? m.macros.filter((x) => x && typeof x.name === 'string' && typeof x.body === 'string').map((x) => ({ name: x.name, body: x.body }))
      : [],
    seed: Number.isInteger(m.seed) && m.seed >= 0 ? m.seed : 0,
    graph: m.graph && typeof m.graph === 'object' ? m.graph : null,
  }
}

/** Parses and validates a project file (version 1 or 2); throws an error with `code`. */
export function parseProject(input) {
  let data
  try {
    data = typeof input === 'string' ? JSON.parse(input) : input
  } catch {
    throw projectError('projectInvalid', 'Not a JSON file.')
  }
  if (data?.format !== PROJECT_FORMAT) throw projectError('projectInvalid', 'Not a Modellwerk project.')
  if (data.version > PROJECT_VERSION) throw projectError('projectTooNew', 'Project was saved by a newer version.')
  const view = typeof data.view === 'object' && data.view ? data.view : {}
  if (!data.version || data.version === 1) {
    if (typeof data.model !== 'object' || !data.model) throw projectError('projectInvalid', 'Not a Modellwerk project.')
    const sim = cleanSimulation(data.model)
    return { title: sim.name, simulations: [sim], active: 0, view }
  }
  if (!Array.isArray(data.simulations) || !data.simulations.length) throw projectError('projectInvalid', 'The project has no simulation.')
  const simulations = data.simulations.map(cleanSimulation)
  const active = Number.isInteger(data.active) && data.active >= 0 && data.active < simulations.length ? data.active : 0
  return { title: text(data.title), simulations, active, view }
}
