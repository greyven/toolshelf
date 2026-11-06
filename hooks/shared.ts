// Réglages et fiches automatiques, communs à toutes les discussions : un fichier fixe du profil.
import { atom, read, update } from 'claude-code'

import type { AutoInfo, Prefs } from '../types'

import { type Dollar, readJson, sharedPath, writeJson } from './files'
import { DEFAULTS } from './state'
import type { Lang } from './textes'

const auto = atom({ plugin: 'toolshelf', key: 'auto' } as const, {})
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

// fiches : les fiches rédigées en français, d'avant le choix de la langue ; fichesParLangue : toutes, par langue.
export type Shared = { prefs?: Partial<Prefs>; fiches?: Record<string, AutoInfo>; fichesParLangue?: Partial<Record<Lang, Record<string, AutoInfo>>> }

export function fichesOf(shared: Shared, lang: Lang): Record<string, AutoInfo> {
  return shared.fichesParLangue?.[lang] ?? (lang === 'fr' ? shared.fiches : undefined) ?? {}
}

// Garde les fiches d'une langue sans toucher à celles des autres.
export async function writeFiches($: Dollar, lang: Lang, fiches: Record<string, AutoInfo>) {
  const shared = await readShared($)
  await writeShared($, { fichesParLangue: { ...shared.fichesParLangue, [lang]: fiches } })
}

// Un fichier illisible vaut un fichier vide : il sera réécrit au prochain réglage.
export async function readShared($: Dollar): Promise<Shared> {
  return ((await readJson($, await sharedPath($))) as Shared | undefined) ?? {}
}

// Relit le fichier avant d'écrire, pour ne pas effacer ce qu'une autre discussion vient d'y mettre.
export async function writeShared($: Dollar, patch: Shared) {
  await writeJson($, await sharedPath($), { ...(await readShared($)), ...patch })
}

export function withDefaults(saved: Partial<Prefs>): Prefs {
  return { ...DEFAULTS, ...saved, colors: { ...DEFAULTS.colors, ...saved.colors } }
}

// Remplace l'état de la discussion par ce que contient le fichier commun : réglages, et fiches de la langue choisie.
export async function applyShared($: Dollar, shared: Shared) {
  const p = withDefaults(shared.prefs ?? (await read($, prefs)) ?? {})
  await update($, prefs, () => p)
  await update($, auto, () => fichesOf(shared, p.lang))
}

// Une autre discussion a pu changer les réglages entre-temps.
export async function reloadShared($: Dollar) {
  await applyShared($, await readShared($))
}

// Premier lancement avec le fichier commun : on y reprend ce que cette copie avait gardé dans $.store.
export async function migrateFromStore($: Dollar): Promise<Shared> {
  const shared = await readShared($)
  if (shared.prefs || shared.fiches) return shared
  const old: Shared = {
    prefs: (await $.store.get('prefs')) as Partial<Prefs> | undefined,
    fiches: (await $.store.get('fiches')) as Record<string, AutoInfo> | undefined,
  }
  if (old.prefs || old.fiches) await writeShared($, old)
  return old
}

export async function setPrefs($: Dollar, fn: (p: Prefs) => Prefs) {
  await update($, prefs, p => fn(p ?? DEFAULTS))
  await writeShared($, { prefs: await read($, prefs) })
}
