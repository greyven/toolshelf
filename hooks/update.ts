// Les mises à jour du mod : compare la version installée à celle publiée sur GitHub, et installe la nouvelle sur demande.
import { atom, read, update } from 'claude-code'

import type { ChangelogEntry } from '../types'

import { claudeDir, claudeExe, type Dollar, readJson } from './files'
import { setPrefs } from './shared'
import { DEFAULTS, ME } from './state'
import { textes } from './textes'

const offer = atom({ plugin: 'toolshelf', key: 'update' } as const, null)
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

// « 0.10.2 » > « 0.9.9 » : comparaison nombre par nombre.
export function isNewer(a: string, b: string) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d > 0
  }
  return false
}

// Ce qui change entre la version installée (exclue) et la publiée (incluse), plus récent d'abord.
export function notesBetween(log: ChangelogEntry[], from: string, to: string, lang: 'fr' | 'en') {
  return log
    .filter(e => isNewer(e.version, from) && !isNewer(e.version, to))
    .sort((a, b) => (isNewer(a.version, b.version) ? -1 : 1))
    .flatMap(e => (e[lang] ?? e.en ?? []).map(n => `${e.version} · ${n}`))
}

// https://github.com/<owner>/<repo> → l'adresse brute de sa branche main.
// shortcut: branche « main » écrite en dur, à rendre réglable si le dépôt en change.
function rawBase(repository: unknown) {
  const m = typeof repository === 'string' ? repository.match(/github\.com\/([^/]+\/[^/.]+)/) : null
  return m ? `https://raw.githubusercontent.com/${m[1]}/main/` : undefined
}

async function fetchJson($: Dollar, url: string): Promise<any> {
  try {
    const r = await $.http.fetch(url)
    return r.ok ? JSON.parse(r.text) : undefined
  } catch {
    return undefined
  }
}

// En arrière-plan au début de la discussion. Sans réseau ou sans dépôt GitHub, rien n'est proposé.
export async function checkUpdate($: Dollar) {
  const local = await readJson($, `${$.plugin.root}/.claude-plugin/plugin.json`)
  const base = rawBase(local?.repository)
  if (typeof local?.version !== 'string' || !base) return
  const remote = await fetchJson($, base + '.claude-plugin/plugin.json')
  const to = remote?.version
  const p = (await read($, prefs)) ?? DEFAULTS
  if (typeof to !== 'string' || !isNewer(to, local.version) || p.ignoredUpdate === to) return
  const installed: Record<string, any> = (await readJson($, `${await claudeDir($)}/plugins/installed_plugins.json`))?.plugins ?? {}
  const key = Object.keys(installed).find(k => k.split('@')[0] === ME)
  if (!key) return
  // Déjà installée (le mod chargé reste l'ancien jusqu'à /reload-plugins) : Claude Code en garde la version, on ne la repropose pas.
  const recorded = installed[key]?.[0]?.version
  if (typeof recorded === 'string' && !isNewer(to, recorded)) return
  const log: unknown = await fetchJson($, base + 'changelog.json')
  const notes = Array.isArray(log) ? notesBetween(log as ChangelogEntry[], local.version, to, p.lang) : []
  await update($, offer, () => ({ from: local.version, to, key, notes, status: 'offered' as const }))
}

// Rafraîchit la marketplace, puis met le mod à jour ; la nouvelle version vaut pour les nouvelles discussions.
export async function installUpdate($: Dollar) {
  const o = await read($, offer)
  if (!o || o.status !== 'offered') return
  await update($, offer, x => (x ? { ...x, status: 'installing' as const } : x))
  const exe = await claudeExe($)
  const marketplace = o.key.split('@')[1] ?? ''
  let ok = false
  try {
    await $.process.run([exe, 'plugin', 'marketplace', 'update', marketplace], { timeoutMs: 120000 })
    ok = (await $.process.run([exe, 'plugin', 'update', o.key, '--scope', 'user'], { timeoutMs: 120000 })).exitCode === 0
  } catch {}
  await update($, offer, x => (x ? { ...x, status: ok ? ('done' as const) : ('offered' as const) } : x))
  if (!ok) $.ui.toast(textes(((await read($, prefs)) ?? DEFAULTS).lang).updateFailed)
}

export async function ignoreUpdate($: Dollar) {
  const o = await read($, offer)
  if (o) await setPrefs($, q => ({ ...q, ignoredUpdate: o.to }))
  await update($, offer, () => null)
}

// Fermée mais gardée : ↻ Actualiser ne repropose pas la version que l'on vient d'installer.
export async function closeUpdate($: Dollar) {
  await update($, offer, x => (x ? { ...x, status: 'closed' as const } : x))
}
