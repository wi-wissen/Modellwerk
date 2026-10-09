<template>
  <section class="graph-editor @container flex flex-col gap-3" :aria-label="$t('graph.title')">
    <!-- Tools -->
    <div role="toolbar" :aria-label="$t('graph.toolbar')" class="flex flex-wrap items-center gap-1.5">
      <button v-for="t in tools" :key="t.id" type="button" class="btn" :class="{ 'is-selected': tool === t.id }"
              :aria-pressed="tool === t.id ? 'true' : 'false'" @click="setTool(t.id)">
        <component :is="t.icon" :size="18" aria-hidden="true" /> {{ $t(`graph.tools.${t.id}`) }}
      </button>
      <span v-if="tool === 'flow'" class="seg" role="group" :aria-label="$t('graph.flowSign')">
        <button v-for="s in ['+', '-']" :key="s" type="button" :class="{ 'is-selected': flowSign === s }"
                :aria-pressed="flowSign === s ? 'true' : 'false'" @click="flowSign = s">
          {{ $t(s === '+' ? 'graph.inflowShort' : 'graph.outflowShort') }}
        </button>
      </span>
    </div>
    <p :id="`${uid}-hint`" class="text-sm text-muted">{{ hint }}</p>

    <div class="grid items-start gap-3 @4xl:grid-cols-[minmax(0,1fr)_21rem]">
      <!-- Drawing area -->
      <div ref="wrap" class="panel canvas-wrap overflow-auto">
        <svg ref="svg" class="canvas block" :width="size.w" :height="size.h" :viewBox="`0 0 ${size.w} ${size.h}`"
             role="group" :aria-label="$t('graph.canvas')" :aria-describedby="`${uid}-hint`"
             :class="{ 'is-placing': isNodeTool, 'is-linking': isLinkTool }"
             @pointerdown="onCanvasDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
          <defs>
            <pattern :id="`${uid}-grid`" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0 L0 0 0 20" fill="none" stroke="var(--grid)" stroke-width="1" />
            </pattern>
            <marker :id="`${uid}-flow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--rate)" />
            </marker>
            <marker :id="`${uid}-info`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
            </marker>
            <marker :id="`${uid}-bad`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--bad)" />
            </marker>
          </defs>
          <rect class="bg" x="0" y="0" :width="size.w" :height="size.h" :fill="`url(#${uid}-grid)`" @click="onBackgroundClick" />

          <!-- links -->
          <g v-for="e in edges" :key="e.id" class="glink" :class="{ 'is-bad': e.bad, 'is-sel': selectedLinkId === e.id }"
             @pointerdown.stop="onLinkDown(e.id)">
            <path :d="e.d" class="hit" />
            <path v-if="selectedLinkId === e.id" :d="e.d" fill="none" stroke="var(--accent)" :stroke-width="e.kind === 'flow' ? 11 : 6" stroke-opacity="0.35" stroke-linecap="round" />
            <template v-if="e.kind === 'flow'">
              <path :d="e.d" fill="none" :stroke="e.bad ? 'var(--bad)' : 'var(--rate)'" stroke-width="5" :marker-end="`url(#${uid}-${e.bad ? 'bad' : 'flow'})`" />
              <circle :cx="e.mx" :cy="e.my" r="11" fill="var(--sheet)" :stroke="e.bad ? 'var(--bad)' : 'var(--rate)'" stroke-width="2" />
              <text :x="e.mx" :y="e.my + 5" text-anchor="middle" font-size="15" font-weight="800" :fill="e.bad ? 'var(--bad)' : 'var(--rate)'">{{ e.sign === '-' ? '−' : '+' }}</text>
            </template>
            <path v-else :d="e.d" fill="none" :stroke="e.bad ? 'var(--bad)' : 'var(--muted)'" stroke-width="1.5" stroke-dasharray="5 4"
                  :marker-end="`url(#${uid}-${e.bad ? 'bad' : 'info'})`" />
          </g>
          <line v-if="pendingNode && pointer" :x1="pendingNode.x" :y1="pendingNode.y" :x2="pointer.x" :y2="pointer.y"
                stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4" pointer-events="none" />

          <!-- nodes -->
          <g v-for="n in nodes" :key="n.id" :ref="(el) => setNodeRef(n.id, el)" class="gnode" :class="`role-${n.kind}`"
             tabindex="0" role="button" :aria-label="nodeLabel(n)" :aria-pressed="selectedId === n.id ? 'true' : 'false'"
             :aria-describedby="nodeProblems(n.id).length ? `${uid}-np-${n.id}` : null"
             @pointerdown.stop="onNodeDown($event, n)" @keydown="onNodeKey($event, n)" @focus="focusedId = n.id" @blur="focusedId = null">
            <path class="focus-ring" :d="outline(n, 9)" />
            <path v-if="selectedId === n.id || pendingFrom === n.id" :d="outline(n, 5)" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5" />
            <path :d="outline(n, 0)" fill="var(--role-soft)" :stroke="hasError(n.id) ? 'var(--bad)' : 'var(--role)'"
                  :stroke-width="hasError(n.id) ? 3 : n.kind === 'constant' ? 1.5 : 2.5"
                  :stroke-dasharray="n.kind === 'constant' && !hasError(n.id) ? '4 3' : null" />
            <path v-if="n.kind === 'rate'" :d="valve(n)" fill="var(--role)" opacity="0.8" />
            <text :x="n.x" :y="n.y + 5" text-anchor="middle" :font-size="n.kind === 'rate' ? 13 : 14" font-weight="700"
                  :fill="n.name.trim() ? 'var(--ink)' : 'var(--muted)'" :font-style="n.name.trim() ? null : 'italic'">{{ short(n.name.trim() || $t('graph.unnamed'), 14) }}</text>
            <text v-if="nodeProblems(n.id).length" :x="n.x" :y="n.y + shape(n).ry + 17" text-anchor="middle" font-size="12" font-weight="700"
                  paint-order="stroke" stroke="var(--sheet)" stroke-width="4" stroke-linejoin="round"
                  :fill="hasError(n.id) ? 'var(--bad)' : 'var(--muted)'">{{ (hasError(n.id) ? '⚠ ' : 'ⓘ ') + $t(`graph.short.${nodeProblems(n.id)[0].code}`) }}</text>
            <desc v-if="nodeProblems(n.id).length" :id="`${uid}-np-${n.id}`">{{ nodeProblems(n.id).map(problemText).join(' ') }}</desc>
          </g>
        </svg>
      </div>

      <!-- Side panel -->
      <aside class="panel flex flex-col gap-3 p-3" :aria-label="$t('graph.panel.title')">
        <template v-if="selected">
          <div class="flex items-center justify-between gap-2">
            <h4 ref="panelHeading" tabindex="-1" class="font-bold">{{ selected.name.trim() || $t('graph.unnamed') }}</h4>
            <span class="chip" :class="`role-${selected.kind}`">{{ $t(`graph.kinds.${selected.kind}`) }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <label :for="`${uid}-name`" class="text-sm font-semibold">{{ $t('graph.panel.name') }}</label>
            <input :id="`${uid}-name`" ref="nameInput" class="field font-mono" :value="selected.name" autocomplete="off" spellcheck="false"
                   :aria-invalid="nameError ? 'true' : 'false'" :aria-describedby="nameError ? `${uid}-name-err` : null"
                   @focus="nameAtFocus = selected.name" @input="setNodeField('name', $event.target.value)" @change="renameReferences"
                   @keydown.enter="$event.target.blur()" />
            <p v-if="nameError" :id="`${uid}-name-err`" class="text-sm text-bad">{{ problemText(nameError) }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label :for="`${uid}-kind`" class="text-sm font-semibold">{{ $t('graph.panel.kind') }}</label>
            <select :id="`${uid}-kind`" class="field" :value="selected.kind" @change="setKind($event.target.value)">
              <option v-for="k in kinds" :key="k" :value="k">{{ $t(`graph.kinds.${k}`) }}</option>
            </select>
          </div>

          <!-- formula -->
          <div v-if="selected.kind === 'rate' || selected.kind === 'aux'" class="flex flex-col gap-1.5">
            <label :for="`${uid}-formula`" class="text-sm font-semibold">{{ $t('graph.panel.formula') }}</label>
            <div class="flex items-center gap-1.5">
              <span class="shrink-0 whitespace-nowrap font-mono text-sm text-muted" aria-hidden="true">{{ short(selected.name.trim() || '?', 10) }} :=</span>
              <input :id="`${uid}-formula`" ref="formulaInput" class="field font-mono" :value="selected.formula" autocomplete="off" spellcheck="false"
                     :aria-invalid="formulaProblems.some((p) => p.severity === 'error') ? 'true' : 'false'"
                     :aria-describedby="`${uid}-formula-help` + (formulaProblems.length ? ` ${uid}-formula-err` : '')"
                     @input="setNodeField('formula', $event.target.value)" />
            </div>
            <p :id="`${uid}-formula-help`" class="text-sm text-muted">{{ $t('graph.panel.formulaHelp') }}</p>
            <ul v-if="formulaProblems.length" :id="`${uid}-formula-err`" class="text-sm">
              <li v-for="(p, i) in formulaProblems" :key="i" :class="p.severity === 'error' ? 'text-bad' : 'text-muted'">{{ problemText(p) }}</li>
            </ul>
            <p class="text-sm font-semibold">{{ $t('graph.panel.inputs') }}</p>
            <div v-if="inputs.length" class="flex flex-wrap gap-1.5" role="group" :aria-label="$t('graph.panel.inputs')">
              <button v-for="n in inputs" :key="n.id" type="button" class="btn btn-sm font-mono" :class="`role-${n.kind} input-btn`"
                      :aria-label="$t('graph.panel.insert', { text: n.name })" @click="insert(n.name.trim())">{{ n.name.trim() || '?' }}</button>
            </div>
            <p v-else class="text-sm text-muted">{{ $t('graph.panel.noInputs') }}</p>
            <div class="flex flex-wrap gap-1" role="group" :aria-label="$t('graph.panel.functions')">
              <button v-for="f in functions" :key="f" type="button" class="btn btn-sm font-mono" :title="$t(`functions.${f.toUpperCase()}`)"
                      :aria-label="$t('graph.panel.insert', { text: `${f}( )` })" @click="insert(`${f}(`, ')')">{{ f }}</button>
            </div>
            <div class="flex flex-wrap gap-1" role="group" :aria-label="$t('graph.panel.operators')">
              <button v-for="o in operators" :key="o" type="button" class="btn btn-sm btn-op font-mono"
                      :aria-label="$t('graph.panel.insert', { text: o })" @click="insert(o)">{{ o }}</button>
            </div>
          </div>
          <p v-else-if="selected.kind === 'constant'" class="text-sm text-muted">{{ $t('graph.panel.constantHelp') }}</p>
          <p v-else class="text-sm text-muted">{{ $t('graph.panel.stateHelp') }}</p>

          <!-- connections -->
          <div class="flex flex-col gap-1.5">
            <p class="text-sm font-semibold">{{ $t('graph.panel.links') }}</p>
            <ul v-if="selectedLinks.length" class="flex flex-col gap-1">
              <li v-for="l in selectedLinks" :key="l.id" class="flex flex-wrap items-center justify-between gap-1 text-sm">
                <span>{{ linkText(l) }}</span>
                <span class="flex gap-1">
                  <button v-if="l.kind === 'flow'" type="button" class="btn btn-sm" :aria-label="$t('graph.toggleSignOf', { link: linkText(l) })" @click="toggleSign(l.id)">
                    <ArrowRightLeft :size="16" aria-hidden="true" /> {{ $t('graph.toggleSign') }}
                  </button>
                  <button type="button" class="btn btn-sm" :aria-label="$t('graph.deleteItem', { item: linkText(l) })" @click="deleteLink(l.id)">
                    <Trash2 :size="16" aria-hidden="true" />
                  </button>
                </span>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">{{ $t('graph.panel.noLinks') }}</p>
            <div v-if="influenceTargets.length" class="flex items-end gap-1.5">
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <label :for="`${uid}-acts`" class="text-sm">{{ $t('graph.panel.actsOn') }}</label>
                <select :id="`${uid}-acts`" v-model="actsOn" class="field">
                  <option value="">{{ $t('graph.panel.choose') }}</option>
                  <option v-for="n in influenceTargets" :key="n.id" :value="n.id">{{ n.name.trim() || $t('graph.unnamed') }}</option>
                </select>
              </div>
              <button type="button" class="btn" :disabled="!actsOn" @click="addLinkFromPanel('influence')"><Plus :size="16" aria-hidden="true" /> {{ $t('graph.panel.connect') }}</button>
            </div>
            <div v-if="selected.kind === 'rate' && flowTargets.length" class="flex flex-wrap items-end gap-1.5">
              <div class="flex min-w-0 basis-full flex-col gap-1">
                <label :for="`${uid}-flows`" class="text-sm">{{ $t('graph.panel.flowsInto') }}</label>
                <select :id="`${uid}-flows`" v-model="flowsInto" class="field">
                  <option value="">{{ $t('graph.panel.choose') }}</option>
                  <option v-for="n in flowTargets" :key="n.id" :value="n.id">{{ n.name.trim() || $t('graph.unnamed') }}</option>
                </select>
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <label :for="`${uid}-sign`" class="text-sm">{{ $t('graph.panel.sign') }}</label>
                <select :id="`${uid}-sign`" v-model="panelSign" class="field">
                  <option value="+">{{ $t('graph.inflowShort') }}</option>
                  <option value="-">{{ $t('graph.outflowShort') }}</option>
                </select>
              </div>
              <button type="button" class="btn" :disabled="!flowsInto" @click="addLinkFromPanel('flow')"><Plus :size="16" aria-hidden="true" /> {{ $t('graph.panel.connect') }}</button>
            </div>
          </div>
          <button type="button" class="btn self-start" @click="deleteNode(selected.id)"><Trash2 :size="16" aria-hidden="true" /> {{ $t('graph.panel.deleteNode') }}</button>
        </template>

        <template v-else-if="selectedLink">
          <h4 ref="panelHeading" tabindex="-1" class="font-bold">{{ $t(`graph.linkKinds.${selectedLink.kind}`) }}</h4>
          <p>{{ linkText(selectedLink) }}</p>
          <ul v-if="linkProblems.length" class="text-sm text-bad">
            <li v-for="(p, i) in linkProblems" :key="i">{{ problemText(p) }}</li>
          </ul>
          <div class="flex flex-wrap gap-1.5">
            <button v-if="selectedLink.kind === 'flow'" type="button" class="btn" @click="toggleSign(selectedLink.id)">
              <ArrowRightLeft :size="16" aria-hidden="true" /> {{ $t('graph.toggleSign') }}
            </button>
            <button type="button" class="btn" @click="deleteLink(selectedLink.id)"><Trash2 :size="16" aria-hidden="true" /> {{ $t('graph.panel.deleteLink') }}</button>
          </div>
        </template>

        <template v-else>
          <h4 class="font-bold">{{ $t('graph.panel.title') }}</h4>
          <p class="text-sm text-muted">{{ $t('graph.panel.empty') }}</p>
          <p class="text-sm text-muted">{{ $t('graph.panel.keys') }}</p>
        </template>
      </aside>
    </div>

    <p role="status" aria-live="polite" class="status text-sm">{{ message }}</p>

    <!-- Problems -->
    <section :aria-labelledby="`${uid}-problems`" class="flex flex-col gap-1.5">
      <h4 :id="`${uid}-problems`" class="font-bold">{{ $t('graph.problemsTitle', { n: problems.length }) }}</h4>
      <p v-if="!problems.length" class="text-sm text-ok">{{ $t('graph.noProblems') }}</p>
      <ul v-else class="flex flex-col gap-1">
        <li v-for="(p, i) in problems" :key="i">
          <button type="button" class="problem" :class="p.severity" @click="goToProblem(p)">
            <component :is="p.severity === 'error' ? 'CircleAlert' : 'Info'" :size="16" aria-hidden="true" class="mt-0.5 flex-none" />
            <span><span class="sr-only">{{ $t(`graph.severity.${p.severity}`) }}: </span>{{ problemText(p) }}</span>
          </button>
        </li>
      </ul>
    </section>

    <!-- Elements: complete non-graphical alternative -->
    <details class="elements" :open="elementsOpen" @toggle="elementsOpen = $event.target.open">
      <summary class="cursor-pointer font-bold">{{ $t('graph.elements', { nodes: nodes.length, links: links.length }) }}</summary>
      <div class="mt-2 flex flex-col gap-3">
        <div class="flex flex-wrap items-end gap-1.5">
          <div class="flex flex-col gap-1">
            <label :for="`${uid}-newkind`" class="text-sm">{{ $t('graph.newElement') }}</label>
            <select :id="`${uid}-newkind`" v-model="newKind" class="field">
              <option v-for="k in kinds" :key="k" :value="k">{{ $t(`graph.kinds.${k}`) }}</option>
            </select>
          </div>
          <button type="button" class="btn" @click="addNodeFromList"><Plus :size="16" aria-hidden="true" /> {{ $t('graph.add') }}</button>
        </div>
        <ul class="flex flex-col gap-1" :aria-label="$t('graph.nodesList')">
          <li v-for="n in nodes" :key="n.id" class="item">
            <span class="chip" :class="`role-${n.kind}`">{{ $t(`graph.kinds.${n.kind}`) }}</span>
            <span class="min-w-0 flex-1 font-mono">{{ n.name.trim() || $t('graph.unnamed') }}<span v-if="n.formula && (n.kind === 'rate' || n.kind === 'aux')" class="text-muted"> := {{ n.formula }}</span></span>
            <span v-if="nodeProblems(n.id).length" :class="hasError(n.id) ? 'text-bad' : 'text-muted'" class="text-sm">{{ $t('graph.problemCount', { n: nodeProblems(n.id).length }) }}</span>
            <span class="flex gap-1">
              <button type="button" class="btn btn-sm" :aria-label="$t('graph.editItem', { item: n.name.trim() || $t('graph.unnamed') })" @click="editNode(n.id)"><Pencil :size="16" aria-hidden="true" /> {{ $t('graph.edit') }}</button>
              <button type="button" class="btn btn-sm" :aria-label="$t('graph.deleteItem', { item: n.name.trim() || $t('graph.unnamed') })" @click="deleteNode(n.id)"><Trash2 :size="16" aria-hidden="true" /> {{ $t('graph.delete') }}</button>
            </span>
          </li>
        </ul>
        <ul v-if="links.length" class="flex flex-col gap-1" :aria-label="$t('graph.linksList')">
          <li v-for="l in links" :key="l.id" class="item">
            <span class="min-w-0 flex-1">{{ linkText(l) }}</span>
            <span class="flex gap-1">
              <button type="button" class="btn btn-sm" :aria-label="$t('graph.editItem', { item: linkText(l) })" @click="editLink(l.id)"><Pencil :size="16" aria-hidden="true" /> {{ $t('graph.edit') }}</button>
              <button type="button" class="btn btn-sm" :aria-label="$t('graph.deleteItem', { item: linkText(l) })" @click="deleteLink(l.id)"><Trash2 :size="16" aria-hidden="true" /> {{ $t('graph.delete') }}</button>
            </span>
          </li>
        </ul>
      </div>
    </details>
  </section>
</template>

<script>
import {
  ArrowRightLeft, Circle, CircleAlert, Hexagon, Info, MousePointer2, MoveRight, Pencil, Pill, Plus, Spline, Square, Trash2,
} from 'lucide-vue-next'
import { LAYOUT, NODE_SHAPE, canLink, cloneGraph, nextId, validateGraph } from '../engine/graph.js'

let instances = 0
const IDENT = /^[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*$/
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default {
  name: 'GraphEditor',
  components: { ArrowRightLeft, CircleAlert, Info, Pencil, Plus, Trash2 },
  props: {
    modelValue: { type: Object, required: true },
    extended: { type: Boolean, default: false },
    // names the formulas may use without an arrow (see engine/graph.js)
    simplified: { type: Boolean, default: true },
    timeName: { type: String, default: 'Zeit' },
    dtName: { type: String, default: 'DeltaT' },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      uid: `ge${++instances}`,
      tool: 'select',
      flowSign: '+',
      selectedId: null,
      selectedLinkId: null,
      pendingFrom: null,
      pointer: null,
      drag: null,
      focusedId: null,
      message: '',
      nameAtFocus: '',
      actsOn: '',
      flowsInto: '',
      panelSign: '+',
      newKind: 'state',
      elementsOpen: false,
      wrapWidth: 0,
      functions: ['sqr', 'sqrt', 'exp', 'ln', 'sin', 'cos', 'arctan', 'abs', 'int', 'frac', 'random'],
      operators: ['+', '-', '*', '/', '^', '(', ')'],
    }
  },
  computed: {
    nodes() { return this.modelValue?.nodes ?? [] },
    links() { return this.modelValue?.links ?? [] },
    byId() { return new Map(this.nodes.map((n) => [n.id, n])) },
    kinds() { return this.extended ? ['state', 'rate', 'constant', 'aux'] : ['state', 'rate', 'constant'] },
    tools() {
      const all = [
        { id: 'select', icon: MousePointer2 }, { id: 'state', icon: Square }, { id: 'rate', icon: Circle },
        { id: 'constant', icon: Pill }, { id: 'aux', icon: Hexagon }, { id: 'flow', icon: MoveRight },
        { id: 'influence', icon: Spline }, { id: 'delete', icon: Trash2 },
      ]
      return all.filter((t) => t.id !== 'aux' || this.extended)
    },
    isNodeTool() { return ['state', 'rate', 'constant', 'aux'].includes(this.tool) },
    isLinkTool() { return this.tool === 'flow' || this.tool === 'influence' },
    pendingNode() { return this.pendingFrom ? this.byId.get(this.pendingFrom) : null },
    hint() {
      if (this.pendingNode) return this.$t('graph.hints.pickTarget', { name: this.pendingNode.name.trim() || this.$t('graph.unnamed') })
      return this.$t(`graph.hints.${this.tool}`)
    },
    options() {
      return { extended: this.extended, simplified: this.simplified, timeName: this.timeName, dtName: this.dtName }
    },
    problems() {
      // errors first, then warnings, each in node order
      const order = new Map(this.nodes.map((n, i) => [n.id, i]))
      return validateGraph({ nodes: this.nodes, links: this.links }, this.options)
        .map((p, i) => ({ ...p, i }))
        .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1) ||
          (order.get(a.nodeId) ?? 1e9) - (order.get(b.nodeId) ?? 1e9) || a.i - b.i)
    },
    problemsByNode() {
      const m = new Map()
      for (const p of this.problems) {
        for (const id of p.nodeIds ?? (p.nodeId ? [p.nodeId] : [])) {
          if (!m.has(id)) m.set(id, [])
          m.get(id).push(p)
        }
      }
      return m
    },
    selected() { return this.selectedId ? this.byId.get(this.selectedId) ?? null : null },
    selectedLink() { return this.selectedLinkId ? this.links.find((l) => l.id === this.selectedLinkId) ?? null : null },
    nameError() {
      return this.nodeProblems(this.selectedId).find((p) => ['emptyName', 'invalidName', 'reservedName', 'duplicateName'].includes(p.code)) ?? null
    },
    formulaProblems() {
      const codes = ['missingFormula', 'formulaError', 'unknownName', 'missingInput', 'unusedInput', 'selfReference', 'functionOfState', 'cycle']
      return this.nodeProblems(this.selectedId).filter((p) => codes.includes(p.code))
    },
    linkProblems() { return this.problems.filter((p) => p.linkId === this.selectedLinkId) },
    inputs() {
      if (!this.selected) return []
      return this.links.filter((l) => l.kind === 'influence' && l.to === this.selected.id).map((l) => this.byId.get(l.from)).filter(Boolean)
    },
    selectedLinks() {
      if (!this.selected) return []
      return this.links.filter((l) => l.from === this.selected.id || l.to === this.selected.id)
    },
    influenceTargets() {
      const s = this.selected
      if (!s) return []
      return this.nodes.filter((n) => canLink(s, n, 'influence') && !this.links.some((l) => l.kind === 'influence' && l.from === s.id && l.to === n.id))
    },
    flowTargets() {
      const s = this.selected
      if (!s || s.kind !== 'rate') return []
      return this.nodes.filter((n) => canLink(s, n, 'flow') && !this.links.some((l) => l.kind === 'flow' && l.from === s.id && l.to === n.id))
    },
    size() {
      const w = Math.max(640, this.wrapWidth - 2, ...this.nodes.map((n) => n.x + this.shape(n).rx + 60))
      const h = Math.max(380, ...this.nodes.map((n) => n.y + this.shape(n).ry + 60))
      return { w: Math.ceil(w), h: Math.ceil(h) }
    },
    edges() {
      const bad = new Set(this.problems.filter((p) => p.linkId && p.severity === 'error').map((p) => p.linkId))
      const out = []
      for (const l of this.links) {
        const a = this.byId.get(l.from)
        const b = this.byId.get(l.to)
        if (!a || !b || a === b) continue
        out.push({ ...l, ...this.geometry(a, b, l.kind === 'influence'), bad: bad.has(l.id) })
      }
      return out
    },
  },
  watch: {
    extended(on) {
      if (!on && this.tool === 'aux') this.tool = 'select'
      if (!on && this.newKind === 'aux') this.newKind = 'state'
    },
    selectedId() { this.actsOn = ''; this.flowsInto = '' },
  },
  mounted() {
    this.nodeEls = new Map()
    this.ro = new ResizeObserver(([e]) => { this.wrapWidth = e.contentRect.width })
    this.ro.observe(this.$refs.wrap)
  },
  beforeUnmount() {
    this.ro?.disconnect()
  },
  methods: {
    // ----- changes: always emit a modified copy -----
    commit(change) {
      const g = cloneGraph(this.modelValue)
      change(g)
      this.$emit('update:modelValue', g)
      return g
    },
    say(key, params) {
      // re-set so that the same message is announced again
      this.message = ''
      this.$nextTick(() => { this.message = this.$t(key, params) })
    },
    nameOf(id) {
      const n = this.byId.get(id)
      return n ? n.name.trim() || this.$t('graph.unnamed') : '?'
    },

    // ----- tools -----
    setTool(id) {
      this.tool = id
      this.pendingFrom = null
      this.say('graph.toolChosen', { tool: this.$t(`graph.tools.${id}`) })
    },
    uniqueName(kind) {
      const base = this.$t(`graph.defaultName.${kind}`)
      const used = new Set(this.nodes.map((n) => n.name.trim().toUpperCase()))
      let i = 1
      while (used.has(`${base}${i}`.toUpperCase())) i++
      return `${base}${i}`
    },
    addNode(kind, x, y) {
      const name = this.uniqueName(kind)
      let id
      this.commit((g) => {
        id = nextId(g, 'n')
        g.nodes.push({ id, kind, name, x: Math.round(x), y: Math.round(y), formula: '' })
      })
      this.selectedId = id
      this.selectedLinkId = null
      this.say('graph.nodeAdded', { kind: this.$t(`graph.kinds.${kind}`), name })
      this.$nextTick(() => {
        const el = this.$refs.nameInput
        if (el) { el.focus(); el.select() }
      })
    },
    freeSpot(kind) {
      const row = kind === 'aux' ? 'rate' : kind
      const y = LAYOUT.row[row]
      const xs = this.nodes.filter((n) => Math.abs(n.y - y) < 40).map((n) => n.x)
      return { x: xs.length ? Math.max(...xs) + LAYOUT.gap[row] : LAYOUT.left[row], y }
    },
    addNodeFromList() {
      const { x, y } = this.freeSpot(this.newKind)
      this.addNode(this.newKind, x, y)
    },
    deleteNode(id) {
      const name = this.nameOf(id)
      const index = this.nodes.findIndex((n) => n.id === id)
      this.commit((g) => {
        g.nodes = g.nodes.filter((n) => n.id !== id)
        g.links = g.links.filter((l) => l.from !== id && l.to !== id)
      })
      if (this.selectedId === id) this.selectedId = null
      if (this.pendingFrom === id) this.pendingFrom = null
      this.say('graph.nodeDeleted', { name })
      // keep the keyboard focus nearby
      if (this.focusedId === id) {
        this.$nextTick(() => {
          const next = this.nodes[Math.min(index, this.nodes.length - 1)]
          if (next) this.nodeEls.get(next.id)?.focus()
        })
      }
    },
    deleteLink(id) {
      const l = this.links.find((x) => x.id === id)
      const text = l ? this.linkText(l) : ''
      this.commit((g) => { g.links = g.links.filter((x) => x.id !== id) })
      if (this.selectedLinkId === id) this.selectedLinkId = null
      this.say('graph.linkDeleted', { link: text })
    },
    toggleSign(id) {
      const g = this.commit((g) => {
        const l = g.links.find((x) => x.id === id)
        if (l) l.sign = l.sign === '-' ? '+' : '-'
      })
      const l = g.links.find((x) => x.id === id)
      if (l) this.say('graph.signChanged', { link: this.linkText(l, g) })
    },
    tryLink(fromId, toId, kind, sign = '+') {
      let a = this.byId.get(fromId)
      let b = this.byId.get(toId)
      if (kind === 'flow' && a?.kind === 'state' && b?.kind === 'rate') [a, b] = [b, a] // drawn backwards
      if (!canLink(a, b, kind)) {
        this.say(kind === 'flow' ? 'graph.cannotFlow' : 'graph.cannotInfluence')
        return false
      }
      if (this.links.some((l) => l.kind === kind && l.from === a.id && l.to === b.id)) {
        this.say('graph.linkExists')
        return false
      }
      const g = this.commit((g) => { g.links.push({ id: nextId(g, 'l'), from: a.id, to: b.id, kind, sign: kind === 'flow' ? sign : '+' }) })
      this.say('graph.linkAdded', { link: this.linkText(g.links[g.links.length - 1], g) })
      return true
    },
    pickForLink(n) {
      if (!this.pendingFrom) {
        if (this.tool === 'flow' && n.kind !== 'rate' && n.kind !== 'state') {
          this.say('graph.cannotFlow')
          return
        }
        this.pendingFrom = n.id
        this.say('graph.hints.pickTarget', { name: n.name.trim() || this.$t('graph.unnamed') })
        return
      }
      if (this.pendingFrom === n.id) { this.pendingFrom = null; this.say('graph.linkCancelled'); return }
      const from = this.pendingFrom
      this.pendingFrom = null
      const ok = this.tryLink(from, n.id, this.tool, this.flowSign)
      if (ok && this.tool === 'influence') { this.selectedId = n.id; this.selectedLinkId = null }
    },
    addLinkFromPanel(kind) {
      const to = kind === 'flow' ? this.flowsInto : this.actsOn
      if (to && this.tryLink(this.selected.id, to, kind, this.panelSign)) {
        this.actsOn = ''
        this.flowsInto = ''
      }
    },

    // ----- panel editing -----
    setNodeField(field, value) {
      const id = this.selectedId
      this.commit((g) => {
        const n = g.nodes.find((x) => x.id === id)
        if (n) n[field] = value
      })
    },
    renameReferences() {
      const id = this.selectedId
      const before = this.nameAtFocus.trim()
      const after = this.selected?.name.trim() ?? ''
      this.nameAtFocus = after
      if (!IDENT.test(before) || !IDENT.test(after) || before.toUpperCase() === after.toUpperCase()) return
      const re = new RegExp(`(?<![A-Za-z0-9ÄÖÜäöüß_.,])${escapeRe(before)}(?![A-Za-z0-9ÄÖÜäöüß_])`, 'gi')
      let count = 0
      this.commit((g) => {
        for (const n of g.nodes) {
          if (n.id === id || !n.formula) continue
          const f = n.formula.replace(re, () => { count++; return after })
          n.formula = f
        }
      })
      if (count) this.say('graph.renamed', { before, after, n: count })
    },
    setKind(kind) {
      const id = this.selectedId
      let removed = 0
      this.commit((g) => {
        const n = g.nodes.find((x) => x.id === id)
        n.kind = kind
        if (kind === 'state' || kind === 'constant') n.formula = ''
        const byId = new Map(g.nodes.map((x) => [x.id, x]))
        const keep = g.links.filter((l) => canLink(byId.get(l.from), byId.get(l.to), l.kind))
        removed = g.links.length - keep.length
        g.links = keep
      })
      this.say(removed ? 'graph.kindChangedLinks' : 'graph.kindChanged', { kind: this.$t(`graph.kinds.${kind}`), n: removed })
    },
    insert(text, after = '') {
      const el = this.$refs.formulaInput
      const value = this.selected?.formula ?? ''
      const start = el ? el.selectionStart ?? value.length : value.length
      const end = el ? el.selectionEnd ?? value.length : value.length
      const inner = value.slice(start, end)
      const next = value.slice(0, start) + text + inner + after + value.slice(end)
      this.setNodeField('formula', next)
      const caret = start + text.length + inner.length + (inner ? after.length : 0)
      this.$nextTick(() => {
        const f = this.$refs.formulaInput
        if (f) { f.focus(); f.setSelectionRange(caret, caret) }
      })
    },

    // ----- selection -----
    select(id, { focusPanel = false } = {}) {
      this.selectedId = id
      this.selectedLinkId = null
      if (focusPanel) this.$nextTick(() => this.$refs.nameInput?.focus())
    },
    editNode(id) { this.select(id, { focusPanel: true }) },
    editLink(id) {
      this.selectedId = null
      this.selectedLinkId = id
      this.$nextTick(() => this.$refs.panelHeading?.focus())
    },
    goToProblem(p) {
      if (p.nodeId && this.byId.has(p.nodeId)) {
        this.selectedId = p.nodeId
        this.selectedLinkId = null
        const formulaCodes = ['missingFormula', 'formulaError', 'unknownName', 'missingInput', 'unusedInput', 'selfReference', 'functionOfState', 'cycle']
        this.$nextTick(() => {
          const target = formulaCodes.includes(p.code) ? this.$refs.formulaInput ?? this.$refs.nameInput : this.$refs.nameInput
          target?.focus()
          this.nodeEls.get(p.nodeId)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
        })
      } else if (p.linkId) this.editLink(p.linkId)
    },

    // ----- pointer -----
    toSvg(e) {
      const svg = this.$refs.svg
      const m = svg.getScreenCTM()
      if (!m) return { x: e.offsetX, y: e.offsetY }
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
      return { x: p.x, y: p.y }
    },
    // nodes are created on click (not pointerdown), so that the browser's own
    // focus handling of the press is over before the name field gets the focus
    onBackgroundClick(e) {
      if (!this.isNodeTool) return
      const p = this.toSvg(e)
      this.addNode(this.tool, Math.round(p.x / 10) * 10, Math.round(p.y / 10) * 10)
    },
    onCanvasDown(e) {
      if (e.button > 0 || this.isNodeTool) return
      if (this.pendingFrom) {
        this.pendingFrom = null
        this.say('graph.linkCancelled')
      } else {
        this.selectedId = null
        this.selectedLinkId = null
      }
    },
    onNodeDown(e, n) {
      if (e.button > 0) return
      if (this.tool === 'delete') { this.deleteNode(n.id); return }
      if (this.isLinkTool) { this.pickForLink(n); return }
      this.select(n.id)
      const p = this.toSvg(e)
      this.drag = { id: n.id, px: p.x, py: p.y, x: n.x, y: n.y, moved: false }
      this.$refs.svg.setPointerCapture?.(e.pointerId)
    },
    onLinkDown(id) {
      if (this.tool === 'delete') { this.deleteLink(id); return }
      this.selectedId = null
      this.selectedLinkId = id
    },
    onPointerMove(e) {
      const p = this.toSvg(e)
      if (this.pendingFrom) this.pointer = p
      const d = this.drag
      if (!d) return
      const dx = p.x - d.px
      const dy = p.y - d.py
      if (!d.moved && Math.hypot(dx, dy) < 4) return
      d.moved = true
      this.moveTo(d.id, d.x + dx, d.y + dy)
    },
    onPointerUp() {
      if (this.drag?.moved) this.say('graph.moved', { name: this.nameOf(this.drag.id) })
      this.drag = null
    },
    moveTo(id, x, y) {
      const n = this.byId.get(id)
      const s = this.shape(n)
      x = Math.round(Math.max(s.rx + 4, x))
      y = Math.round(Math.max(s.ry + 4, y))
      this.commit((g) => {
        const m = g.nodes.find((k) => k.id === id)
        if (m) { m.x = x; m.y = y }
      })
    },

    // ----- keyboard on nodes -----
    onNodeKey(e, n) {
      const step = e.shiftKey ? 50 : 10
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (moves[e.key]) {
        e.preventDefault()
        const [dx, dy] = moves[e.key]
        this.moveTo(n.id, n.x + dx, n.y + dy)
        this.say('graph.movedTo', { name: this.nameOf(n.id), x: Math.round(n.x + dx), y: Math.round(n.y + dy) })
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        this.deleteNode(n.id)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (this.isLinkTool) this.pickForLink(n)
        else if (this.tool === 'delete') this.deleteNode(n.id)
        else this.select(n.id, { focusPanel: true })
      } else if (e.key === 'Escape') {
        if (this.pendingFrom) { this.pendingFrom = null; this.say('graph.linkCancelled') } else this.selectedId = null
      }
    },
    setNodeRef(id, el) {
      if (!this.nodeEls) this.nodeEls = new Map()
      if (el) this.nodeEls.set(id, el)
      else this.nodeEls.delete(id)
    },

    // ----- drawing -----
    shape(n) { return NODE_SHAPE[n.kind] ?? NODE_SHAPE.constant },
    outline(n, grow) {
      const { rx, ry } = this.shape(n)
      const w = rx + grow
      const h = ry + grow
      if (n.kind === 'rate') return `M${n.x - w},${n.y} a${w},${h} 0 1,0 ${2 * w},0 a${w},${h} 0 1,0 ${-2 * w},0 z`
      const r = n.kind === 'state' ? 8 + grow : h
      const x0 = n.x - w
      const y0 = n.y - h
      return `M${x0 + r},${y0} h${2 * w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${2 * h - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(2 * w - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} v${-(2 * h - 2 * r)} a${r},${r} 0 0 1 ${r},${-r} z`
    },
    // small bow-tie valve on top of a rate, as in stock-and-flow diagrams
    valve(n) {
      const y = n.y - this.shape(n).ry
      return `M${n.x - 9},${y - 6} L${n.x + 9},${y + 6} L${n.x + 9},${y - 6} L${n.x - 9},${y + 6} z`
    },
    // distance from the centre of a node to its outline in direction (ux, uy)
    reach(n, ux, uy) {
      const { rx, ry } = this.shape(n)
      if (n.kind === 'rate') return 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2)
      return Math.min(rx / Math.abs(ux || 1e-9), ry / Math.abs(uy || 1e-9))
    },
    geometry(a, b, curved) {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      // influences bend a little, so they never cover a flow between the same nodes
      const bend = curved ? Math.min(46, len * 0.18) : 0
      const cx = (a.x + b.x) / 2 - (dy / len) * bend
      const cy = (a.y + b.y) / 2 + (dx / len) * bend
      const dir = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l] }
      const [u1x, u1y] = dir(cx - a.x, cy - a.y)
      const [u2x, u2y] = dir(b.x - cx, b.y - cy)
      const r1 = this.reach(a, u1x, u1y)
      const r2 = this.reach(b, u2x, u2y) + 4
      const x1 = a.x + u1x * r1
      const y1 = a.y + u1y * r1
      const x2 = b.x - u2x * r2
      const y2 = b.y - u2y * r2
      const d = curved ? `M${x1},${y1} Q${cx},${cy} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`
      const mx = curved ? 0.25 * x1 + 0.5 * cx + 0.25 * x2 : (x1 + x2) / 2
      const my = curved ? 0.25 * y1 + 0.5 * cy + 0.25 * y2 : (y1 + y2) / 2
      return { d, mx, my }
    },
    short(text, n) {
      return text.length > n ? text.slice(0, n - 1) + '…' : text
    },

    // ----- texts -----
    nodeProblems(id) { return (id && this.problemsByNode.get(id)) || [] },
    hasError(id) { return this.nodeProblems(id).some((p) => p.severity === 'error') },
    nodeLabel(n) {
      const parts = [`${this.$t(`graph.kinds.${n.kind}`)} ${n.name.trim() || this.$t('graph.unnamed')}`]
      if ((n.kind === 'rate' || n.kind === 'aux') && n.formula.trim()) parts.push(this.$t('graph.formulaIs', { formula: n.formula.trim() }))
      const p = this.nodeProblems(n.id)
      if (p.length) parts.push(this.$t('graph.problemCount', { n: p.length }))
      return parts.join(', ')
    },
    linkText(l, g = null) {
      const name = (id) => {
        const n = g ? g.nodes.find((x) => x.id === id) : this.byId.get(id)
        return n ? n.name.trim() || this.$t('graph.unnamed') : '?'
      }
      if (l.kind === 'flow') return this.$t(l.sign === '-' ? 'graph.outflowText' : 'graph.inflowText', { from: name(l.from), to: name(l.to) })
      return this.$t('graph.influenceText', { from: name(l.from), to: name(l.to) })
    },
    problemText(p) {
      const params = { ...p.params }
      if (p.code === 'formulaError') {
        params.message = this.$t(`errors.${p.params.code}`, p.params.details)
        params.column = p.params.column ?? '?'
      }
      if (p.params.kind) params.kind = this.$t(`graph.linkKinds.${p.params.kind}`)
      return this.$t(`graph.problems.${p.code}`, params)
    },
  },
}
</script>

<style scoped>
.role-aux { --role: var(--s3); --role-soft: color-mix(in srgb, var(--s3) 14%, var(--sheet)); --role-strong: color-mix(in srgb, var(--s3) 70%, var(--ink)); }
.canvas-wrap { max-height: 72vh; }
.canvas { user-select: none; -webkit-user-select: none; }
.canvas.is-placing .bg { cursor: copy; }
.canvas.is-linking .gnode { cursor: crosshair; }
.gnode { cursor: grab; touch-action: none; outline: none; }
.gnode:active { cursor: grabbing; }
.gnode .focus-ring { fill: none; stroke: var(--accent); stroke-width: 3; opacity: 0; }
.gnode:focus-visible .focus-ring { opacity: 1; }
.glink { cursor: pointer; }
.glink .hit { fill: none; stroke: transparent; stroke-width: 18; }
.btn-sm { min-height: 2.25rem; padding: 0.2rem 0.55rem; font-size: 0.85rem; }
.btn-op { min-width: 2.25rem; justify-content: center; }
.input-btn { color: var(--role-strong); background: var(--role-soft); border-color: var(--role); }
.status:empty { display: none; }
.status { padding: 0.35rem 0.6rem; border-radius: 0.5rem; background: var(--sunken); }
.problem {
  display: flex; gap: 0.5rem; width: 100%; text-align: left; padding: 0.35rem 0.6rem; border-radius: 0.5rem;
  border: 1px solid var(--line); background: var(--sheet); color: var(--ink); font-size: 0.92rem; cursor: pointer;
}
.problem.error { border-color: var(--bad); background: var(--bad-soft); }
.problem.error svg { color: var(--bad); }
.problem:hover { border-color: var(--accent); }
.item { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.3rem 0; border-bottom: 1px solid var(--grid); }
</style>
