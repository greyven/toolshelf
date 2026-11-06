// Fiches rédigées par le modèle pour les outils sans fiche écrite à la main.
import { atom, read, update } from 'claude-code'

import type { AutoInfo, Found } from '../types'

import { MODES, short } from './fiches'
import type { Dollar } from './files'
import { fichesOf, readShared, writeFiches } from './shared'
import { DEFAULTS } from './state'
import { textes } from './textes'

const auto = atom({ plugin: 'toolshelf', key: 'auto' } as const, {})
const found = atom({ plugin: 'toolshelf', key: 'found' } as const, [])
const generating = atom({ plugin: 'toolshelf', key: 'generating' } as const, [])
const livrees = atom({ plugin: 'toolshelf', key: 'livrees' } as const, {})
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

// La réponse du modèle est vérifiée champ par champ avant d'être gardée ; lève une erreur si elle n'est pas du JSON.
export function parseFiche(text: string, f: Found): AutoInfo {
  const raw = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Partial<AutoInfo>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  return {
    mode: MODES.includes(raw.mode as string) ? (raw.mode as AutoInfo['mode']) : 'actif',
    what: str(raw.what, 120) || short(f.desc),
    how: str(raw.how, 500),
    why: str(raw.why, 300),
    when: str(raw.when, 300),
    ex: Array.isArray(raw.ex) ? raw.ex.filter((x): x is string => typeof x === 'string').slice(0, 4).map(x => x.slice(0, 120)) : [],
    trigger: str(raw.trigger, 300) || '(?!)',
    hint: str(raw.hint, 120),
  }
}

// Garde la fiche dans la discussion et dans le fichier commun, sans effacer celles d'une autre discussion ou langue.
async function saveFiche($: Dollar, id: string, fiche: AutoInfo) {
  const lang = ((await read($, prefs)) ?? DEFAULTS).lang
  const all = { ...fichesOf(await readShared($), lang), ...((await read($, auto)) ?? {}), [id]: fiche }
  await update($, auto, () => all)
  await writeFiches($, lang, all)
}

export async function writeFiche($: Dollar, f: Found) {
  await update($, generating, g => [...g.filter(x => x !== f.id), f.id])
  try {
    const t = textes(((await read($, prefs)) ?? DEFAULTS).lang)
    const r = await $.model.complete({
      model: 'haiku',
      maxTokens: 900,
      timeoutMs: 60000,
      system: t.ficheSystem,
      prompt: t.fichePrompt(f.id, f.kind, f.desc, f.commands.slice(0, 25).join(', ')),
    })
    if (r.isAnswered) await saveFiche($, f.id, parseFiche(r.text, f))
  } catch {
    // shortcut: une réponse illisible laisse l'outil sans fiche, le bouton « Régénérer » permet de réessayer
  } finally {
    await update($, generating, g => g.filter(x => x !== f.id))
  }
}

// Une fiche à la fois, seulement pour les outils qui n'en ont ni dans le répertoire ni déjà générée.
export async function fillMissing($: Dollar) {
  const have = { ...((await read($, auto)) ?? {}), ...((await read($, livrees)) ?? {}) }
  const busy = (await read($, generating)) ?? []
  for (const f of (await read($, found)) ?? []) {
    if (!have[f.id] && !busy.includes(f.id)) await writeFiche($, f)
  }
}
