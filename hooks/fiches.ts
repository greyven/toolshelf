// Les fiches des outils : leur forme, et leur lecture. Les textes sont dans le répertoire fiches/ du mod.
import type { AutoInfo } from '../types'

export type Mode = 'passif' | 'actif' | 'mixte'
export type Info = { mode: Mode; what: string; how: string; why: string; when: string; ex: string[]; trigger: RegExp; hint: string }

export const MODES: readonly string[] = ['passif', 'actif', 'mixte']

// Une fiche du répertoire ou rédigée par le modèle ; une regex invalide désactive juste la suggestion.
export function toInfo(a: AutoInfo): Info {
  let trigger = /(?!)/
  try {
    trigger = new RegExp(a.trigger, 'i')
  } catch {}
  return { ...a, trigger }
}

// La fiche d'un outil, dans les fiches connues (répertoire et fiches rédigées réunis).
export function infoOf(id: string, cards: Record<string, AutoInfo>): Info | undefined {
  const a = cards[id]
  return a ? toInfo(a) : undefined
}

// Les mots-clés d'une fiche : les choix de premier niveau de sa regex, sans \b ni parenthèses autour.
// « \b(code|où (est|se trouve))\b » donne ["code", "où (est|se trouve)"].
export function keywordsOf(trigger: string): string[] {
  if (trigger === '(?!)') return [] // la regex qui ne trouve jamais rien : aucun mot-clé
  let t = trigger.replace(/^\\b/, '').replace(/\\b$/, '')
  if (t.startsWith('(') && t.endsWith(')') && closingParen(t) === t.length - 1) t = t.slice(1, -1)
  const words: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '\\') i++
    else if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === '|' && depth === 0) {
      words.push(t.slice(start, i))
      start = i + 1
    }
  }
  words.push(t.slice(start))
  return words.map(w => w.replace(/^\\b/, '').replace(/\\b$/, '')).filter(Boolean)
}

// Position de la parenthèse qui ferme celle du début.
function closingParen(t: string) {
  let depth = 0
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\') i++
    else if (t[i] === '(') depth++
    else if (t[i] === ')' && --depth === 0) return i
  }
  return -1
}

export function triggerOf(words: string[]): string {
  return words.length > 0 ? `(${words.join('|')})` : '(?!)'
}

// Un mot-clé tapé par l'utilisateur est un texte, pas une regex : « c++ » ne doit rien casser.
export function literalKeyword(text: string): string {
  return text.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Les fiches avec les mots-clés modifiés par l'utilisateur à la place des leurs.
export function withKeywords(cards: Record<string, AutoInfo>, overrides: Record<string, string[]> | undefined): Record<string, AutoInfo> {
  if (!overrides) return cards
  const out = { ...cards }
  for (const [id, words] of Object.entries(overrides)) {
    const card = out[id]
    if (card) out[id] = { ...card, trigger: triggerOf(words) }
  }
  return out
}

// Une ligne repliée reste courte : première phrase, 90 caractères au plus.
export function short(t: string) {
  const one = t.split(/(?<=\.)\s/)[0] ?? t
  return one.length > 90 ? one.slice(0, 89) + '…' : one
}
