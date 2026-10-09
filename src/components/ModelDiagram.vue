<template>
  <section aria-labelledby="diagram-title" class="flex flex-col gap-3">
    <div>
      <h3 id="diagram-title" class="text-lg font-bold">Wirkungsdiagramm</h3>
      <p class="text-muted text-[0.95rem] max-w-[62ch]">
        Das Diagramm zeigt, welche Größe welche beeinflusst. Dicke Pfeile sind Zu- und Abflüsse,
        dünne gestrichelte Pfeile zeigen, wovon eine Rate abhängt.
      </p>
    </div>

    <div class="panel overflow-x-auto p-2">
      <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="block max-w-none"
           role="img" aria-labelledby="diagram-svg-title diagram-svg-desc">
        <title id="diagram-svg-title">Wirkungsdiagramm des Modells</title>
        <desc id="diagram-svg-desc">{{ textDescription.join(' ') }}</desc>
        <defs>
          <marker id="arrow-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--rate)" />
          </marker>
          <marker id="arrow-info" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
          </marker>
        </defs>

        <g fill="none">
          <line v-for="(e, i) in infoEdges" :key="'i' + i" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
                stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#arrow-info)" />
          <g v-for="(e, i) in flowEdges" :key="'f' + i">
            <line :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" stroke="var(--rate)" stroke-width="5" marker-end="url(#arrow-flow)" />
            <circle :cx="e.mx" :cy="e.my" r="11" fill="var(--sheet)" stroke="var(--rate)" stroke-width="2" />
            <text :x="e.mx" :y="e.my + 5" text-anchor="middle" font-size="15" font-weight="800" fill="var(--rate)">{{ e.sign === '+' ? '+' : '−' }}</text>
          </g>
        </g>

        <g v-for="n in nodes" :key="n.name" :class="`role-${n.role}`">
          <rect v-if="n.role === 'state'" :x="n.x - 64" :y="n.y - 26" width="128" height="52" rx="8"
                fill="var(--role-soft)" stroke="var(--role)" stroke-width="2.5" />
          <ellipse v-else-if="n.role === 'rate'" :cx="n.x" :cy="n.y" rx="54" ry="28" fill="var(--role-soft)" stroke="var(--role)" stroke-width="2.5" />
          <rect v-else :x="n.x - 52" :y="n.y - 16" width="104" height="32" rx="16"
                fill="var(--role-soft)" stroke="var(--role)" stroke-width="1.5" stroke-dasharray="4 3" />
          <text :x="n.x" :y="n.y + 5" text-anchor="middle" :font-size="n.role === 'rate' ? 12 : 14" font-weight="700" fill="var(--ink)">{{ short(n.label, 14) }}</text>
        </g>
      </svg>
    </div>

    <ul class="flex flex-wrap gap-2 text-sm" aria-label="Legende">
      <li class="chip role-state">▭ Zustandsgröße</li>
      <li class="chip role-rate">◯ Veränderungsrate</li>
      <li class="chip role-constant">⬭ Konstante</li>
      <li class="chip role-time">⬭ Zeit</li>
    </ul>

    <details class="text-sm">
      <summary class="cursor-pointer font-semibold text-muted">Diagramm als Text</summary>
      <ul class="mt-2 list-disc pl-5">
        <li v-for="(t, i) in textDescription" :key="i">{{ t }}</li>
      </ul>
    </details>
    <p class="text-sm text-muted">Im Mockup wird das Diagramm aus dem Programm gezeichnet. Im fertigen Programm kann man es auch direkt zeichnen.</p>
  </section>
</template>

<script>
const ROW = { constant: 44, time: 44, rate: 160, state: 290 }
const GAP = { constant: 120, time: 120, rate: 150, state: 170 }

export default {
  name: 'ModelDiagram',
  props: {
    analysis: { type: Object, required: true },
  },
  computed: {
    label() {
      return (name) => this.analysis.program.variables.get(name) ?? name
    },
    layout() {
      const { roles, flows, influences } = this.analysis
      const byRole = (r) => [...roles].filter(([, role]) => role === r).map(([n]) => n)
      const pos = new Map()
      const place = (names, row, order) => {
        const sorted = [...names].sort((a, b) => order(a) - order(b))
        sorted.forEach((n, i) => pos.set(n, { x: 90 + i * GAP[row], y: ROW[row], role: row }))
      }
      const states = byRole('state')
      place(states, 'state', (n) => states.indexOf(n))
      const meanX = (list) => (list.length ? list.reduce((a, n) => a + (pos.get(n)?.x ?? 0), 0) / list.length : 1e6)
      const rates = byRole('rate')
      place(rates, 'rate', (n) => meanX(flows.filter((f) => f.rate === n).map((f) => f.state)))
      const tops = [...byRole('constant'), ...byRole('time')]
      tops.forEach((n) => {
        const targets = influences.filter((e) => e.from === n).map((e) => e.to)
        pos.set(n, { order: meanX(targets) })
      })
      const sortedTops = [...tops].sort((a, b) => pos.get(a).order - pos.get(b).order)
      sortedTops.forEach((n, i) => pos.set(n, { x: 70 + i * GAP.constant, y: ROW.constant, role: roles.get(n) }))
      return pos
    },
    nodes() {
      return [...this.layout].map(([name, p]) => ({ name, label: this.label(name), ...p }))
    },
    width() {
      return Math.max(420, ...this.nodes.map((n) => n.x + 90))
    },
    height() { return 340 },
    flowEdges() {
      return this.analysis.flows
        .filter((f) => this.layout.has(f.rate) && this.layout.has(f.state))
        .map((f) => this.edge(f.rate, f.state, 32, 30, f.sign))
    },
    infoEdges() {
      return this.analysis.influences
        .filter((e) => this.layout.has(e.from) && this.layout.has(e.to) && e.from !== e.to)
        .map((e) => this.edge(e.from, e.to, this.radius(e.from), this.radius(e.to)))
    },
    textDescription() {
      const { flows, influences, roles } = this.analysis
      const out = []
      for (const [n, r] of roles) {
        if (r !== 'state') continue
        const zu = flows.filter((f) => f.state === n && f.sign === '+').map((f) => this.label(f.rate))
        const ab = flows.filter((f) => f.state === n && f.sign === '-').map((f) => this.label(f.rate))
        out.push(`${this.label(n)} ist eine Zustandsgröße${zu.length ? `, Zufluss: ${zu.join(', ')}` : ''}${ab.length ? `, Abfluss: ${ab.join(', ')}` : ''}.`)
      }
      for (const [n, r] of roles) {
        if (r !== 'rate') continue
        const from = influences.filter((e) => e.to === n).map((e) => this.label(e.from))
        out.push(`${this.label(n)} wird berechnet${from.length ? ` aus ${from.join(', ')}` : ''}.`)
      }
      return out
    },
  },
  methods: {
    radius(name) {
      const r = this.layout.get(name)?.role
      return r === 'state' ? 30 : r === 'rate' ? 30 : 18
    },
    edge(from, to, r1, r2, sign) {
      const a = this.layout.get(from)
      const b = this.layout.get(to)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const x1 = a.x + ux * r1
      const y1 = a.y + uy * r1
      const x2 = b.x - ux * (r2 + 4)
      const y2 = b.y - uy * (r2 + 4)
      return { x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, sign }
    },
    short(text, n) {
      return text.length > n ? text.slice(0, n - 1) + '…' : text
    },
  },
}
</script>
