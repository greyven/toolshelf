// Choix d'une couleur : ouvrir le sélecteur, viser un point du dégradé, taper un code hexadécimal.
import { atom, read, update } from 'claude-code'

import type { Tint } from '../types'

import { hexToHsv, hsvToHex, normHex } from './colors'
import type { Dollar } from './files'
import { setPrefs } from './shared'
import { DEFAULTS } from './state'

const picking = atom({ plugin: 'toolshelf', key: 'picking' } as const, null)
const pickHsv = atom({ plugin: 'toolshelf', key: 'pickHsv' } as const, null)
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

export type ColorTarget = Tint | 'bg'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export async function setColor($: Dollar, target: ColorTarget, hex: string) {
  await setPrefs($, q => (target === 'bg' ? { ...q, bg: hex } : { ...q, colors: { ...q.colors, [target]: hex } }))
}

// Ouvre le sélecteur sur la couleur actuelle, ou le ferme s'il était déjà ouvert sur elle.
export async function togglePicker($: Dollar, target: ColorTarget) {
  const p = (await read($, prefs)) ?? DEFAULTS
  await update($, pickHsv, () => hexToHsv(target === 'bg' ? p.bg ?? '#1b1b1b' : p.colors[target]))
  await update($, picking, was => (was === target ? null : target))
}

// Une couleur tapée en hexadécimal repositionne aussi le sélecteur.
export async function typeHex($: Dollar, target: ColorTarget, text: string) {
  await update($, pickHsv, () => hexToHsv(normHex(text)))
  await setColor($, target, normHex(text))
}

// Un point du dégradé (fx, fy entre 0 et 1) : la barre de teinte change la teinte, le carré la saturation et la luminosité.
export async function pickAt($: Dollar, target: ColorTarget, zone: 'sv' | 'hue', fx: number, fy: number) {
  const cur = (await read($, pickHsv)) ?? { h: 0, s: 1, v: 1 }
  const next = zone === 'hue' ? { ...cur, h: clamp01(fy) * 359.9 } : { ...cur, s: clamp01(fx), v: 1 - clamp01(fy) }
  await update($, pickHsv, () => next)
  await setColor($, target, hsvToHex(next.h, next.s, next.v))
}
