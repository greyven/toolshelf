// Suggestions d'outils d'après le texte d'une demande : le nom de l'outil, puis les mots-clés de sa fiche.
import type { AutoInfo } from '../types'

import { toInfo } from './fiches'

// Pas de lettre ni de chiffre juste avant : « sol » ne se trouve plus dans « désolé », ni « rea » dans « réagit ».
const NOT_AFTER_LETTER = '(?<![\\p{L}\\p{N}])'

// Les mots-clés d'une fiche, qui ne comptent qu'en début de mot. Une regex que le mode Unicode refuse garde son sens d'origine.
export function atWordStart(trigger: RegExp): RegExp {
  try {
    return new RegExp(`${NOT_AFTER_LETTER}(?:${trigger.source})`, 'iu')
  } catch {
    return trigger
  }
}

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Le nom de l'outil écrit en toutes lettres, entier ou par morceau : « council » pour llm-council, « unity » pour Unity CLI.
// Morceaux de noms trop courants pour désigner un outil (« claude » est dans presque chaque message).
const COMMON = new Set(['claude', 'cli', 'computer', 'studio', 'docs', 'connecteur', 'claude.ai'])

export function nameMatcher(id: string): RegExp {
  const parts = [id, ...id.split(/[-:_\s]+/)].filter(p => p.length >= 3 && !COMMON.has(p.toLowerCase())).map(escape)
  if (parts.length === 0) return /(?!)/
  return new RegExp(`${NOT_AFTER_LETTER}(?:${[...new Set(parts)].join('|')})(?![\\p{L}\\p{N}])`, 'iu')
}

// Outil → conseil, pour les outils présents nommés dans le texte ou dont les mots-clés y apparaissent.
// Les outils nommés viennent en premier.
export function suggestionsFor(text: string, present: Set<string>, cards: Record<string, AutoInfo>): Record<string, string> {
  const named: [string, string][] = []
  const byKeyword: [string, string][] = []
  for (const id of present) {
    const card = cards[id]
    const info = card ? toInfo(card) : undefined
    const hint = info?.hint || info?.what || id
    if (nameMatcher(id).test(text)) named.push([id, hint])
    else if (info && atWordStart(info.trigger).test(text)) byKeyword.push([id, hint])
  }
  return Object.fromEntries([...named, ...byKeyword])
}
