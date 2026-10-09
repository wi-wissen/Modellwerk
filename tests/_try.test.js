import { it } from 'vitest'
import { EXAMPLES } from '../src/examples.js'
import { analyse, sentencesToProgram } from '../src/engine/model.js'
import { simulate } from '../src/engine/simulate.js'
import { defaultAnimation, frameAt, validateAnimation } from '../src/engine/animation.js'
it('x', () => {
  for (const ex of EXAMPLES) {
    const src = ex.mode === 'sentences' ? sentencesToProgram(ex.sentences, { simplified: true }) : ex.source
    const r = simulate(src, ex.start, ex.steps)
    const { roles } = analyse(src)
    const a = defaultAnimation(r, roles, { context: ex.id })
    const f = frameAt(r, a, Math.round(ex.steps / 3), { width: 600, height: 400 })
    console.log(ex.id, a.background, a.equalScale, a.flipY, JSON.stringify(a.objects.map(o => [o.sprite, o.x, o.y, o.angle, o.angleUnit, o.anchor, o.radius])), JSON.stringify(f.objects.map(o => [o.x, o.y, o.size|0, o.rotation, o.mirror])), validateAnimation(r, a).length)
  }
})
