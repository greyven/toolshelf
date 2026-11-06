// Active ou désactive un outil pour de bon, sans rien supprimer. Prend effet dans les nouvelles discussions.
import { atom, read, update } from 'claude-code'

import type { Found } from '../types'

import { DEFAULTS } from './state'
import { textes } from './textes'
import { claudeDir, claudeExe, type Dollar, homeDir, isWindows, readJson, reservePath, writeJson } from './files'

const found = atom({ plugin: 'toolshelf', key: 'found' } as const, [])
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

// Un plugin : la commande officielle de Claude Code.
async function togglePlugin($: Dollar, key: string, on: boolean) {
  const r = await $.process.run([await claudeExe($), 'plugin', on ? 'enable' : 'disable', key, '--scope', 'user'], { timeoutMs: 60000 })
  return r.exitCode === 0
}

// Un skill personnel : son dossier passe de skills à skills-desactives, ou l'inverse.
// $.fs ne sait pas déplacer un dossier : PowerShell sous Windows, mkdir et mv ailleurs.
async function toggleSkill($: Dollar, key: string, on: boolean) {
  const dir = await claudeDir($)
  const [from, to] = on ? ['skills-desactives', 'skills'] : ['skills', 'skills-desactives']
  const src = `${dir}/${from}/${key}`
  const dstDir = `${dir}/${to}`
  if (!(await isWindows($))) {
    const made = await $.process.run(['mkdir', '-p', dstDir], { timeoutMs: 30000 })
    if (made.exitCode !== 0) return false
    return (await $.process.run(['mv', src, dstDir + '/'], { timeoutMs: 30000 })).exitCode === 0
  }
  // Apostrophes doublées : les chemins sont insérés entre apostrophes dans la commande PowerShell.
  const q = (t: string) => t.replace(/\//g, '\\').replace(/'/g, "''")
  const script = `New-Item -ItemType Directory -Force -Path '${q(dstDir)}' | Out-Null; Move-Item -LiteralPath '${q(src)}' -Destination '${q(dstDir)}'`
  const r = await $.process.run(['powershell', '-NoProfile', '-Command', script], { timeoutMs: 30000 })
  return r.exitCode === 0
}

// Un connecteur : Claude Code n'a pas d'interrupteur global, sa configuration est mise en réserve puis retirée.
async function disableConnector($: Dollar, key: string) {
  const path = await reservePath($)
  const reserve: Record<string, unknown> = (await readJson($, path)) ?? {}
  const cfg = (await readJson($, `${await homeDir($)}/.claude.json`))?.mcpServers?.[key]
  if (!cfg) return false
  // Réserve écrite avant le retrait : si la commande échoue, rien n'est perdu.
  await writeJson($, path, { ...reserve, [key]: cfg })
  const r = await $.process.run([await claudeExe($), 'mcp', 'remove', key, '--scope', 'user'], { timeoutMs: 60000 })
  if (r.exitCode !== 0) await writeJson($, path, reserve)
  return r.exitCode === 0
}

// Remet le connecteur à l'identique depuis la réserve, puis l'en retire.
async function enableConnector($: Dollar, key: string) {
  const path = await reservePath($)
  const reserve: Record<string, unknown> = (await readJson($, path)) ?? {}
  const cfg = reserve[key]
  if (!cfg) return false
  const r = await $.process.run([await claudeExe($), 'mcp', 'add-json', key, JSON.stringify(cfg), '--scope', 'user'], { timeoutMs: 60000 })
  if (r.exitCode !== 0) return false
  delete reserve[key]
  await writeJson($, path, reserve)
  return true
}

async function switchTool($: Dollar, f: Found & { key: string }, on: boolean) {
  if (f.kind === 'plugin') return togglePlugin($, f.key, on)
  if (f.kind === 'connecteur') return on ? enableConnector($, f.key) : disableConnector($, f.key)
  return toggleSkill($, f.key, on)
}

export async function toggleTool($: Dollar, f: Found) {
  if (!f.key) return
  const on = !f.enabled
  let ok = false
  try {
    ok = await switchTool($, { ...f, key: f.key }, on)
  } catch {}
  if (ok) await update($, found, list => list.map(x => (x.id === f.id ? { ...x, enabled: on } : x)))
  const t = textes(((await read($, prefs)) ?? DEFAULTS).lang)
  $.ui.toast(ok ? t.toggled(f.id, on) : t.toggleFailed(f.id, on))
}
