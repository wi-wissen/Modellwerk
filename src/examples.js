// Eigene Beispielmodelle (Neuentwicklung, nicht aus dem Original übernommen).
export const EXAMPLES = [
  {
    id: 'grippe',
    title: 'Grippewelle in der Schule',
    topic: 'Logistisches Wachstum',
    description: 'Wie schnell breitet sich eine Grippe unter 800 Schülerinnen und Schülern aus, wenn am Anfang zwei erkrankt sind?',
    mode: 'sentences',
    simplified: true,
    sentences: [
      { subject: 'Ansteckungen', predicate: 'prop', object: 'Gesunde*Kranke' },
      { subject: 'Kranke', predicate: 'zu', object: 'Ansteckungen' },
      { subject: 'Gesunde', predicate: 'ab', object: 'Ansteckungen' },
    ],
    start: { GESUNDE: 798, KRANKE: 2, FANSTECKUNGEN: 0.0006, ZEIT: 0 },
    steps: 30,
    plot: { x: 'ZEIT', y: ['GESUNDE', 'KRANKE'] },
  },
  {
    id: 'kondensator',
    title: 'Kondensator entlädt sich',
    topic: 'Elektrizitätslehre',
    description: 'Ein Kondensator (C = 470 µF) entlädt sich über einen Widerstand (R = 2,2 kΩ). Die Simulation wird mit der exakten Lösung Q(t) = Q₀·e^(−t/RC) verglichen.',
    mode: 'program',
    source: `// Entladung eines Kondensators über einen Widerstand
U := Q/C
I := U/R
DeltaQ := I*DeltaT
Q := Q - DeltaQ
t := t + DeltaT
// exakte Lösung zum Vergleich
Qexakt := Q0*exp(-t/(R*C))`,
    start: { Q: 0.00423, Q0: 0.00423, C: 0.00047, R: 2200, DELTAT: 0.05, T: 0 },
    steps: 100,
    plot: { x: 'T', y: ['Q', 'QEXAKT'] },
  },
  {
    id: 'fall',
    title: 'Fallschirmsprung',
    topic: 'Mechanik',
    description: 'Eine Springerin (75 kg) fällt mit Luftwiderstand. Nach wenigen Sekunden stellt sich eine konstante Geschwindigkeit ein.',
    mode: 'program',
    source: `// Fall mit Luftwiderstand, F_L = ½·cw·ρ·A·v²
a := g - 0,5*cw*rho*Flaeche*v*abs(v)/m
v := v + a*dt
s := s + v*dt
t := t + dt
vkmh := v*3,6`,
    start: { G: 9.81, CW: 1.0, RHO: 1.2, FLAECHE: 0.7, M: 75, V: 0, S: 0, DT: 0.1, T: 0 },
    steps: 200,
    plot: { x: 'T', y: ['V'] },
  },
  {
    id: 'abkuehlung',
    title: 'Tee kühlt ab',
    topic: 'Begrenztes Wachstum',
    description: 'Eine Tasse Tee mit 90 °C steht in einem Raum mit 21 °C. Je größer der Unterschied, desto schneller kühlt er ab.',
    mode: 'sentences',
    simplified: true,
    sentences: [
      { subject: 'Abkuehlung', predicate: 'prop', object: '(Temperatur-Raum)' },
      { subject: 'Temperatur', predicate: 'ab', object: 'Abkuehlung' },
    ],
    start: { TEMPERATUR: 90, RAUM: 21, FABKUEHLUNG: 0.035, ZEIT: 0 },
    steps: 120,
    plot: { x: 'ZEIT', y: ['TEMPERATUR'] },
  },
  {
    id: 'luchs',
    title: 'Luchse und Schneehasen',
    topic: 'Räuber-Beute-System',
    description: 'Hasen vermehren sich, Luchse fressen Hasen. Die Bestände schwingen gegeneinander – gut sichtbar im Phasendiagramm.',
    mode: 'program',
    source: `// Räuber-Beute-Modell nach Lotka und Volterra
Geburten := 0,04*Hasen
Gefressen := 0,0004*Hasen*Luchse
Nachwuchs := 0,00008*Hasen*Luchse
Sterben := 0,03*Luchse
Hasen := Hasen + Geburten - Gefressen
Luchse := Luchse + Nachwuchs - Sterben
Monat := Monat + 1`,
    start: { HASEN: 600, LUCHSE: 60, MONAT: 0 },
    steps: 600,
    plot: { x: 'MONAT', y: ['HASEN', 'LUCHSE'] },
  },
]
