import { describe, expect, it } from 'vitest'
import { cleanSimulation, parseProject, projectToText, toProject } from '../src/engine/project.js'

describe('project files', () => {
  const sim = cleanSimulation({
    name: 'Test', simplified: false, sentences: [{ subject: 'N', predicate: 'increase', object: 'G' }],
    origin: 'sentences', start: { N: 1.5, G: 0.1 }, steps: 40, dtName: 'dt', seed: 7,
    macros: [{ name: 'Step', body: 'n := n + 1' }],
  })

  it('round-trips several simulations and the view', () => {
    const copy = { ...sim, name: 'Copy', start: { N: 3, G: 0.1 } }
    const text = projectToText(toProject({ title: 'P', simulations: [sim, copy], active: 1, view: { plotX: 'ZEIT', overlay: true } }))
    const back = parseProject(text)
    expect(back.title).toBe('P')
    expect(back.simulations).toEqual([sim, copy])
    expect(back.active).toBe(1)
    expect(back.view).toEqual({ plotX: 'ZEIT', overlay: true })
  })

  it('reads version 1 files with a single model', () => {
    const v1 = { format: 'modellwerk', version: 1, model: { title: 'Old', source: 'a := 1', start: { A: 2 }, steps: 5 }, view: { plotX: 'A' } }
    const back = parseProject(JSON.stringify(v1))
    expect(back.title).toBe('Old')
    expect(back.simulations[0]).toMatchObject({ name: 'Old', source: 'a := 1', start: { A: 2 }, steps: 5, origin: 'program' })
  })

  it('rejects files that are not projects', () => {
    expect(() => parseProject('hello')).toThrow(expect.objectContaining({ code: 'projectInvalid' }))
    expect(() => parseProject('{"format":"other"}')).toThrow(expect.objectContaining({ code: 'projectInvalid' }))
    expect(() => parseProject('{"format":"modellwerk","version":99}')).toThrow(expect.objectContaining({ code: 'projectTooNew' }))
    expect(() => parseProject('{"format":"modellwerk","version":2,"simulations":[]}')).toThrow(expect.objectContaining({ code: 'projectInvalid' }))
  })

  it('drops invalid values instead of failing', () => {
    const back = parseProject('{"format":"modellwerk","version":2,"simulations":[{"start":{"A":1,"B":"x"},"steps":-3,"seed":-1}]}')
    expect(back.simulations[0].start).toEqual({ A: 1 })
    expect(back.simulations[0].steps).toBe(100)
    expect(back.simulations[0].seed).toBe(0)
  })
})
