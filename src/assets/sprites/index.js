// Sprite pack for animations (drawn for Modellwerk).
// All sprites: 64x64 viewBox, anchor = centre of the viewBox.
// size: recommended display size in px; rotates: turn sprite along the direction of motion.
import ball from './ball.svg'
import ballSmall from './ball-small.svg'
import cart from './cart.svg'
import car from './car.svg'
import skydiver from './skydiver.svg'
import parachute from './parachute.svg'
import rocket from './rocket.svg'
import waterRocket from './water-rocket.svg'
import satellite from './satellite.svg'
import earth from './earth.svg'
import moon from './moon.svg'
import sun from './sun.svg'
import planet from './planet.svg'
import pendulumBob from './pendulum-bob.svg'
import massBlock from './mass-block.svg'
import springMass from './spring-mass.svg'
import sunflower from './sunflower.svg'
import drop from './drop.svg'
import iceCube from './ice-cube.svg'
import cup from './cup.svg'
import thermometer from './thermometer.svg'
import house from './house.svg'
import person from './person.svg'
import rabbit from './rabbit.svg'
import lynx from './lynx.svg'
import virus from './virus.svg'
import molecule from './molecule.svg'
import capacitor from './capacitor.svg'
import battery from './battery.svg'
import lightning from './lightning.svg'
import arrow from './arrow.svg'
import star from './star.svg'

export const SPRITES = [
  { id: 'ball', src: ball, name: { de: 'Ball', en: 'Ball' }, size: 32, rotates: false, group: 'mechanics' },
  { id: 'ball-small', src: ballSmall, name: { de: 'Kleiner Ball', en: 'Small ball' }, size: 20, rotates: false, group: 'mechanics' },
  { id: 'cart', src: cart, name: { de: 'Wagen', en: 'Cart' }, size: 48, rotates: false, group: 'mechanics' },
  { id: 'car', src: car, name: { de: 'Auto', en: 'Car' }, size: 48, rotates: true, group: 'mechanics' },
  { id: 'skydiver', src: skydiver, name: { de: 'Fallschirmspringer', en: 'Skydiver' }, size: 48, rotates: false, group: 'mechanics' },
  { id: 'parachute', src: parachute, name: { de: 'Fallschirm', en: 'Parachute' }, size: 56, rotates: false, group: 'mechanics' },
  { id: 'rocket', src: rocket, name: { de: 'Rakete', en: 'Rocket' }, size: 48, rotates: true, group: 'space' },
  { id: 'water-rocket', src: waterRocket, name: { de: 'Wasserrakete', en: 'Water rocket' }, size: 48, rotates: true, group: 'mechanics' },
  { id: 'satellite', src: satellite, name: { de: 'Satellit', en: 'Satellite' }, size: 40, rotates: false, group: 'space' },
  { id: 'earth', src: earth, name: { de: 'Erde', en: 'Earth' }, size: 48, rotates: false, group: 'space' },
  { id: 'moon', src: moon, name: { de: 'Mond', en: 'Moon' }, size: 32, rotates: false, group: 'space' },
  { id: 'sun', src: sun, name: { de: 'Sonne', en: 'Sun' }, size: 56, rotates: false, group: 'space' },
  { id: 'planet', src: planet, name: { de: 'Planet', en: 'Planet' }, size: 40, rotates: false, group: 'space' },
  { id: 'pendulum-bob', src: pendulumBob, name: { de: 'Pendelkörper', en: 'Pendulum bob' }, size: 32, rotates: false, group: 'mechanics' },
  { id: 'mass-block', src: massBlock, name: { de: 'Gewichtsstück', en: 'Mass block' }, size: 36, rotates: false, group: 'mechanics' },
  { id: 'spring-mass', src: springMass, name: { de: 'Federpendel', en: 'Spring with mass' }, size: 56, rotates: false, group: 'mechanics' },
  { id: 'sunflower', src: sunflower, name: { de: 'Sonnenblume', en: 'Sunflower' }, size: 48, rotates: false, group: 'biology' },
  { id: 'drop', src: drop, name: { de: 'Wassertropfen', en: 'Water drop' }, size: 28, rotates: false, group: 'heat' },
  { id: 'ice-cube', src: iceCube, name: { de: 'Eiswürfel', en: 'Ice cube' }, size: 36, rotates: false, group: 'heat' },
  { id: 'cup', src: cup, name: { de: 'Tasse', en: 'Cup' }, size: 40, rotates: false, group: 'heat' },
  { id: 'thermometer', src: thermometer, name: { de: 'Thermometer', en: 'Thermometer' }, size: 48, rotates: false, group: 'heat' },
  { id: 'house', src: house, name: { de: 'Haus', en: 'House' }, size: 48, rotates: false, group: 'other' },
  { id: 'person', src: person, name: { de: 'Person', en: 'Person' }, size: 48, rotates: false, group: 'other' },
  { id: 'rabbit', src: rabbit, name: { de: 'Hase', en: 'Rabbit' }, size: 40, rotates: false, group: 'biology' },
  { id: 'lynx', src: lynx, name: { de: 'Luchs', en: 'Lynx' }, size: 44, rotates: false, group: 'biology' },
  { id: 'virus', src: virus, name: { de: 'Virus', en: 'Virus' }, size: 32, rotates: false, group: 'biology' },
  { id: 'molecule', src: molecule, name: { de: 'Molekül', en: 'Molecule' }, size: 36, rotates: false, group: 'heat' },
  { id: 'capacitor', src: capacitor, name: { de: 'Kondensator', en: 'Capacitor' }, size: 44, rotates: false, group: 'electricity' },
  { id: 'battery', src: battery, name: { de: 'Batterie', en: 'Battery' }, size: 44, rotates: false, group: 'electricity' },
  { id: 'lightning', src: lightning, name: { de: 'Blitz', en: 'Lightning' }, size: 40, rotates: false, group: 'electricity' },
  { id: 'arrow', src: arrow, name: { de: 'Pfeil', en: 'Arrow' }, size: 40, rotates: true, group: 'other' },
  { id: 'star', src: star, name: { de: 'Stern', en: 'Star' }, size: 32, rotates: false, group: 'other' },
]

export const findSprite = (id) => SPRITES.find((s) => s.id === id) ?? SPRITES[0]
