import { describe, expect, it } from 'vitest'
import { parseProject, projectToText, toProject } from '../src/engine/project.js'

describe('project files', () => {
  const model = {
    title: 'Test', simplified: false, sentences: [{ subject: 'N', predicate: 'increase', object: 'G' }],
    origin: 'sentences', source: '', start: { N: 1.5, G: 0.1 }, steps: 40, caseSensitive: false, timeName: 'Zeit', dtName: 'dt',
  }

  it('round-trips a model and its view', () => {
    const text = projectToText(toProject(model, { plotX: 'ZEIT', plotY: ['N'] }))
    const back = parseProject(text)
    expect(back.model).toEqual(model)
    expect(back.view).toEqual({ plotX: 'ZEIT', plotY: ['N'] })
  })

  it('rejects files that are not projects', () => {
    expect(() => parseProject('hello')).toThrow(expect.objectContaining({ code: 'projectInvalid' }))
    expect(() => parseProject('{"format":"other"}')).toThrow(expect.objectContaining({ code: 'projectInvalid' }))
    expect(() => parseProject('{"format":"modellwerk","version":99,"model":{}}')).toThrow(expect.objectContaining({ code: 'projectTooNew' }))
  })

  it('drops invalid values instead of failing', () => {
    const back = parseProject('{"format":"modellwerk","version":1,"model":{"start":{"A":1,"B":"x"},"steps":-3}}')
    expect(back.model.start).toEqual({ A: 1 })
    expect(back.model.steps).toBe(100)
  })
})
