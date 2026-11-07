// L'inventaire des outils : il vient de Claude Code et des fichiers du profil, sans liste écrite à la main.
import { atom, read, update } from 'claude-code'

import type { AutoInfo, Found, PcTool, ToolGroup } from '../types'

import { fillMissing } from './autofiche'
import { claudeDir, type Dollar, homeDir, listDirs, listNames, readJson, reservePath } from './files'
import { DEFAULTS, ME } from './state'
import { textes, type Textes } from './textes'
import { connectorId, splitMcpName } from './usage'

const found = atom({ plugin: 'toolshelf', key: 'found' } as const, [])
const livrees = atom({ plugin: 'toolshelf', key: 'livrees' } as const, {})
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

const PC_TOOLS_FILE = 'fiches/outils-pc.json'

// Une ligne mal écrite du fichier est ignorée, sans empêcher les autres.
function isPcTool(t: unknown): t is PcTool {
  const o = t as PcTool
  return !!o && typeof o.id === 'string' && typeof o.program === 'string' && o.program.length > 0 && (o.commands === undefined || Array.isArray(o.commands))
}

type Groups = Map<string, Found>

// Serveurs internes de l'application : ce ne sont pas des connecteurs de l'utilisateur.
const INTERNAL_SERVERS = /^(ccd_|Claude_Browser|terminal|visualize|plugin-authoring|mcp-registry|scheduled-tasks|computer-use|remote-devices)/

// Plugins et skills chargés : Claude Code les liste avec leurs commandes.
async function addLoadedCommands($: Dollar, groups: Groups, installed: Record<string, unknown>, userSkills: Set<string>) {
  const pluginKey = (name: string) => Object.keys(installed).find(k => k.split('@')[0] === name)
  for (const c of await $.command.list()) {
    const isPlugin = c.source === 'plugin' && !!c.plugin
    if (!isPlugin && c.source !== 'user') continue
    const id = isPlugin ? c.plugin! : c.name
    if (id === ME) continue
    const key = isPlugin ? pluginKey(id) : userSkills.has(id) ? id : undefined
    const g: Found = groups.get(id) ?? { id, kind: isPlugin ? 'plugin' : 'skill', desc: c.description, commands: [], key, enabled: true }
    g.commands.push('/' + c.name)
    groups.set(id, g)
  }
}

// Un plugin désactivé n'a plus de commandes : on le retrouve dans les fichiers, pour pouvoir le réactiver.
function addInstalledPlugins(t: Textes, groups: Groups, installed: Record<string, unknown>, enabledMap: Record<string, boolean>) {
  for (const key of Object.keys(installed)) {
    const id = key.split('@')[0] ?? key
    const on = enabledMap[key] === true
    // Activé mais sans commandes : installé pendant la discussion, il sera chargé dans les nouvelles.
    const desc = on ? t.installedLater : t.pluginOff
    if (id !== ME && !groups.has(id)) groups.set(id, { id, kind: 'plugin', desc, commands: [], key, enabled: on })
  }
}

function addDisabledSkills(t: Textes, groups: Groups, disabled: string[]) {
  for (const id of disabled) {
    if (!groups.has(id)) groups.set(id, { id, kind: 'skill', desc: t.skillOff, commands: [], key: id, enabled: false })
  }
}

// Outils de connecteurs chargés, regroupés par serveur.
// Les connecteurs claude.ai n'ont qu'un identifiant dans les noms d'outils : l'application de bureau donne leur nom
// (« Claude Docs »). Ailleurs (terminal), ce serveur n'existe pas et la carte garde un nom fabriqué.
async function serverLabels($: Dollar) {
  const labels = new Map<string, string>()
  try {
    const r = await $.mcp.call('ccd_connectors', 'session_connectors_status', {})
    const text = r.content.find(c => c.type === 'text') as { text?: string } | undefined
    const servers: unknown = JSON.parse(text?.text ?? '{}').servers
    for (const s of Array.isArray(servers) ? servers : []) {
      if (typeof s?.id === 'string' && typeof s?.name === 'string') labels.set(s.id, s.name)
    }
  } catch {}
  return labels
}

async function loadedServers($: Dollar) {
  const servers = new Map<string, string[]>()
  try {
    for (const t of await $.tool.list()) {
      const parts = t.mcp ? splitMcpName(t.name) : undefined
      if (!parts || INTERNAL_SERVERS.test(parts[0])) continue
      servers.set(parts[0], [...(servers.get(parts[0]) ?? []), parts[1]])
    }
  } catch {}
  return servers
}

// Seuls les connecteurs déclarés sur ce PC (mcpServers de ~/.claude.json) ont une case ; ceux de claude.ai se gèrent sur le site.
// Un connecteur en réserve est désactivé, même si ses outils restent chargés jusqu'à la prochaine discussion.
function addConnectors(t: Textes, groups: Groups, servers: Map<string, string[]>, labels: Map<string, string>, userMcp: Record<string, unknown>, reserve: Record<string, unknown>) {
  for (const [server, names] of servers) {
    const id = connectorId(server, labels.get(server))
    const off = server in reserve
    const key = server in userMcp || off ? server : undefined
    groups.set(id, { id, kind: 'connecteur', desc: t.connectorTools(names.length), commands: names, key, enabled: !off, server })
  }
  for (const server of Object.keys(reserve)) {
    const id = connectorId(server)
    if (!groups.has(id)) groups.set(id, { id, kind: 'connecteur', desc: t.connectorOff, commands: [], key: server, enabled: false, server })
  }
}

// Noms de fichier d'un programme lançable par son nom, sous Windows comme ailleurs.
const RUNNABLE = ['', '.exe', '.cmd', '.bat', '.com']

// Tous les fichiers des dossiers du PATH. On liste les dossiers au lieu de lire les fichiers :
// certains programmes (alias d'application Windows, comme la Unity CLI) refusent la lecture.
async function programsOnPath($: Dollar) {
  const path = (await $.env.get('PATH')) ?? (await $.env.get('Path')) ?? ''
  const dirs = [...new Set(path.split(path.includes(';') ? ';' : ':').filter(Boolean))]
  return new Set((await Promise.all(dirs.map(d => listNames($, d)))).flat())
}

// Outils installés sur l'ordinateur, hors Claude Code, décrits dans fiches/outils-pc.json : affichés, sans case.
async function addPcTools($: Dollar, t: Textes, groups: Groups, tools: PcTool[]) {
  if (tools.length === 0) return
  const onPath = await programsOnPath($)
  for (const tool of tools) {
    const program = tool.program.toLowerCase()
    if (!RUNNABLE.some(ext => onPath.has(program + ext))) continue
    groups.set(tool.id, { id: tool.id, kind: 'outil', desc: t.pcProgram(tool.program), commands: tool.commands ?? [], enabled: true, program: tool.program })
  }
}

const GROUPS_FILE = 'fiches/groupes.json'

function isToolGroup(g: unknown): g is ToolGroup {
  const o = g as ToolGroup
  return !!o && typeof o.id === 'string' && o.id.length > 0 && Array.isArray(o.members)
}

// Chaque membre trouvé reçoit le nom de son groupe ; un outil absent du PC est simplement ignoré.
function markGroups(groups: Groups, list: ToolGroup[]) {
  for (const g of list) {
    for (const id of g.members) {
      const f = groups.get(id)
      if (f) f.group = g.id
    }
  }
}

export async function discover($: Dollar) {
  const home = await homeDir($)
  const dir = await claudeDir($)
  const installed: Record<string, unknown> = (await readJson($, `${dir}/plugins/installed_plugins.json`))?.plugins ?? {}
  const enabledMap: Record<string, boolean> = (await readJson($, `${dir}/settings.json`))?.enabledPlugins ?? {}
  const userMcp: Record<string, unknown> = (await readJson($, `${home}/.claude.json`))?.mcpServers ?? {}
  const reserve: Record<string, unknown> = (await readJson($, await reservePath($))) ?? {}
  const lang = ((await read($, prefs)) ?? DEFAULTS).lang
  const t = textes(lang)
  const fiches: Record<string, AutoInfo> | undefined = await readJson($, `${$.plugin.root}/fiches/${lang}.json`)

  const groups: Groups = new Map()
  await addLoadedCommands($, groups, installed, new Set(await listDirs($, `${dir}/skills`)))
  addInstalledPlugins(t, groups, installed, enabledMap)
  addDisabledSkills(t, groups, await listDirs($, `${dir}/skills-desactives`))
  addConnectors(t, groups, await loadedServers($), await serverLabels($), userMcp, reserve)
  const pcTools: unknown = await readJson($, `${$.plugin.root}/${PC_TOOLS_FILE}`)
  await addPcTools($, t, groups, Array.isArray(pcTools) ? pcTools.filter(isPcTool) : [])
  const toolGroups: unknown = await readJson($, `${$.plugin.root}/${GROUPS_FILE}`)
  markGroups(groups, Array.isArray(toolGroups) ? toolGroups.filter(isToolGroup) : [])

  await update($, found, () => [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)))
  // Relu à chaque recensement : ↻ Actualiser suffit après une modification du répertoire de fiches.
  await update($, livrees, () => fiches ?? {})
  void fillMissing($).catch(() => {}) // en arrière-plan : le panneau s'affiche sans attendre le modèle
}
