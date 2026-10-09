// Modellwerk project files (*.modellwerk.json): an open, human-readable format.
export const PROJECT_FORMAT = 'modellwerk'
export const PROJECT_VERSION = 1
export const PROJECT_EXTENSION = '.modellwerk.json'

const MODEL_KEYS = ['title', 'simplified', 'sentences', 'origin', 'source', 'start', 'steps', 'caseSensitive', 'timeName', 'dtName']

/** Serialises the model and how it is displayed. */
export function toProject(model, view = {}) {
  const data = Object.fromEntries(MODEL_KEYS.filter((k) => model[k] !== undefined).map((k) => [k, model[k]]))
  return { format: PROJECT_FORMAT, version: PROJECT_VERSION, savedAt: new Date().toISOString(), model: data, view }
}

export function projectToText(project) {
  return JSON.stringify(project, null, 2) + '\n'
}

/** Parses and validates a project file; throws an error with `code` on problems. */
export function parseProject(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw Object.assign(new Error('Not a JSON file.'), { code: 'projectInvalid' })
  }
  if (data?.format !== PROJECT_FORMAT || typeof data.model !== 'object') {
    throw Object.assign(new Error('Not a Modellwerk project.'), { code: 'projectInvalid' })
  }
  if (data.version > PROJECT_VERSION) {
    throw Object.assign(new Error('Project was saved by a newer version.'), { code: 'projectTooNew' })
  }
  const m = data.model
  const finite = (x) => typeof x === 'number' && Number.isFinite(x)
  const start = Object.fromEntries(Object.entries(m.start ?? {}).filter(([, v]) => finite(v)))
  return {
    model: {
      title: typeof m.title === 'string' ? m.title : '',
      simplified: m.simplified !== false,
      sentences: Array.isArray(m.sentences)
        ? m.sentences.filter((s) => s && typeof s.subject === 'string').map((s) => ({ subject: s.subject, predicate: String(s.predicate), object: String(s.object ?? '') }))
        : [],
      origin: m.origin === 'sentences' ? 'sentences' : 'program',
      source: typeof m.source === 'string' ? m.source : '',
      start,
      steps: Number.isInteger(m.steps) && m.steps > 0 ? m.steps : 100,
      caseSensitive: m.caseSensitive === true,
      timeName: typeof m.timeName === 'string' ? m.timeName : 'Zeit',
      dtName: typeof m.dtName === 'string' ? m.dtName : 'DeltaT',
    },
    view: typeof data.view === 'object' && data.view ? data.view : {},
  }
}
