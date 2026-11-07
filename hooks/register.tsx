// Branchement du panneau « Mes Outils Installés » sur les événements de Claude Code.
// Chaque événement délègue à une fonction d'un module dédié.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { type ColorTarget, pickAt, togglePicker, typeHex } from './colorpick'
import { isHex } from './colors'
import { discover } from './discover'
import { withKeywords } from './fiches'
import { clearBand, registerBand } from './band'
import type { Dollar } from './files'
import { renderPane } from './pane'
import { applyShared, migrateFromStore, reloadShared } from './shared'
import { DEFAULTS, GROUP, PANE } from './state'
import { textes } from './textes'
import { suggestionsFor } from './suggest'
import { toggleGroup, toggleTool } from './toggle'
import { checkUpdate } from './update'
import { moduleOfCall, owner } from './usage'

const active = atom({ plugin: 'toolshelf', key: 'active' } as const, {})
const auto = atom({ plugin: 'toolshelf', key: 'auto' } as const, {})
const found = atom({ plugin: 'toolshelf', key: 'found' } as const, [])
const hot = atom({ plugin: 'toolshelf', key: 'hot' } as const, {})
const livrees = atom({ plugin: 'toolshelf', key: 'livrees' } as const, {})
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)
const used = atom({ plugin: 'toolshelf', key: 'used' } as const, {})

// Messages des zones cliquables (check.tsx, swatch.tsx, overlay.tsx, picker.tsx).
type ClickMessage = { toggle?: string; open?: ColorTarget; target?: ColorTarget; hex?: string; zone?: 'sv' | 'hue'; fx?: number; fy?: number }

async function onCheckClicked($: Dollar, id: string) {
  const all = (await read($, found)) ?? []
  if (id.startsWith(GROUP)) {
    const group = id.slice(GROUP.length)
    const members = all.filter(x => x.group === group)
    if (members.some(x => x.key)) return toggleGroup($, group, members)
    return $.ui.toast((await t($)).notHere(group))
  }
  const f = all.find(x => x.id === id)
  if (f?.key) await toggleTool($, f)
  else if (f) $.ui.toast((await t($)).notHere(f.id))
}

async function onClick($: Dollar, d: ClickMessage) {
  if (d.toggle) await onCheckClicked($, d.toggle)
  if (d.open) await togglePicker($, d.open)
  if (d.target && d.hex && isHex(d.hex)) await typeHex($, d.target, d.hex)
  if (d.target && d.zone && typeof d.fx === 'number' && typeof d.fy === 'number') await pickAt($, d.target, d.zone, d.fx, d.fy)
}

async function t($: Dollar) {
  return textes(((await read($, prefs)) ?? DEFAULTS).lang)
}

async function openPane($: Dollar) {
  await $.ui.open({ id: PANE, title: (await t($)).paneTitle })
}

// Une commande tapée (/plugin:…) compte comme utilisée ; un texte libre donne des suggestions.
async function onPrompt($: Dollar, text: string, command?: { name: string }) {
  await reloadShared($) // une autre discussion a pu changer les réglages entre-temps
  // Une nouvelle demande : la réponse précédente est finie, plus rien n'est en cours (au cas où sa fin n'aurait pas été signalée).
  await update($, active, () => ({}))
  const ids = new Set(((await read($, found)) ?? []).map(f => f.id))
  if (command) {
    const id = owner(command.name)
    if (ids.has(id)) await update($, used, u => ({ ...u, [id]: '/' + command.name }))
    await update($, hot, () => ({}))
  } else {
    const p = (await read($, prefs)) ?? DEFAULTS
    const cards = withKeywords({ ...((await read($, auto)) ?? {}), ...((await read($, livrees)) ?? {}) }, p.keywords?.[p.lang])
    const suggestions = suggestionsFor(text, ids, cards)
    await update($, hot, () => suggestions)
  }
}

async function markInUse($: Dollar, id: string, what: string) {
  await update($, active, a => ({ ...a, [id]: what }))
  await update($, used, u => ({ ...u, [id]: what }))
}

export const register: Register = (on, options) => {
  on('ui.message', async ($, e) => {
    await onClick($, e.data as ClickMessage)
    return {}
  })

  on('session.start', async ($, e, next) => {
    await applyShared($, await migrateFromStore($))
    await $.command.register({ name: 'tools', description: (await t($)).commandDescription })
    await discover($)
    void openPane($)
    void checkUpdate($).catch(() => {}) // en arrière-plan : la fenêtre apparaît quand GitHub a répondu
    return next(e)
  })

  on('command.run', { command: 'tools' }, async $ => {
    await reloadShared($)
    await discover($)
    await openPane($)
    return { text: (await t($)).commandDone }
  })

  on('prompt.submit', async ($, e, next) => {
    await clearBand($)
    if (!e.isMeta) await onPrompt($, e.text, e.command)
    return next(e)
  })

  // Un skill lancé par Claude lui-même (outil Skill) ou tapé en commande.
  on('skill.prompt', async ($, e, next) => {
    await markInUse($, e.pluginName ?? e.skill, 'skill ' + e.skill)
    await update($, used, u => ({ ...u, [e.pluginName ?? e.skill]: e.skill }))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const m = moduleOfCall(e as unknown as { tool: string }, (await read($, found)) ?? [])
    if (m) await markInUse($, m[0], m[1])
    return next(e)
  })

  // Fin de la réponse : plus rien n'est en cours.
  on('turn.complete', async ($, e, next) => {
    await update($, active, () => ({}))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => renderPane($, e))

  registerBand(on, options)
}
