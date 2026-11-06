// Quel outil du panneau sert un appel : connecteur, agent d'un plugin, ou outil sur PC lancé dans un terminal.
import type { Found } from '../types'

// Nom de carte d'un connecteur : son nom tel que /mcp le liste, sinon un nom lisible à la place d'un identifiant opaque.
export function connectorId(server: string, label?: string) {
  if (label && label !== server) return label
  return /^[0-9a-f]{8}-/.test(server) ? `claude.ai (${server.slice(0, 8)})` : server
}

// Le nom d'une commande de plugin commence par "plugin:" ; sinon c'est le nom du skill.
export function owner(name: string) {
  return name.split(':')[0] ?? name
}

// Un outil de connecteur s'appelle mcp__<serveur>__<outil>.
export function splitMcpName(name: string): [string, string] | undefined {
  const [prefix, server, ...rest] = name.split('__')
  return prefix === 'mcp' && server ? [server, rest.join('__')] : undefined
}

type Call = { tool: string; [k: string]: unknown }
type Use = [card: string, what: string]

// La carte du connecteur est retrouvée par son serveur, pour garder le nom trouvé au recensement.
function connectorUse(e: Call, tools: Found[]): Use | undefined {
  const parts = splitMcpName(e.tool)
  if (!parts) return undefined
  return [tools.find(f => f.server === parts[0])?.id ?? connectorId(parts[0]), parts[1]]
}

function pluginAgentUse(e: Call): Use | undefined {
  const agent = e.subagent_type
  return e.tool === 'Agent' && typeof agent === 'string' && agent.includes(':') ? [owner(agent), 'agent ' + agent] : undefined
}

// Un programme n'est « en cours » que si c'est lui qui est lancé (premier mot d'une commande), pas quand
// son nom apparaît ailleurs, comme dans « Get-Command unity » ou un chemin (faux surlignages constatés).
export function runsProgram(cmd: string, program: string) {
  const name = program.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const launched = new RegExp(`(^|[\\\\/])${name}(\\.(exe|cmd|bat|com))?$`, 'i')
  return cmd.split(/[;&|\n]+/).some(part => {
    const first = part.trim().replace(/^&\s*/, '').split(/\s+/)[0]?.replace(/['"]/g, '') ?? ''
    return launched.test(first)
  })
}

// Un outil sur PC (fiches/outils-pc.json) lancé dans un terminal.
function pcToolUse(e: Call, tools: Found[]): Use | undefined {
  const cmd = e.command
  if ((e.tool !== 'Bash' && e.tool !== 'PowerShell') || typeof cmd !== 'string') return undefined
  const t = tools.find(f => f.program && runsProgram(cmd, f.program))
  return t ? [t.id, cmd.trim().slice(0, 40)] : undefined
}

export function moduleOfCall(e: Call, tools: Found[]): Use | undefined {
  return connectorUse(e, tools) ?? pluginAgentUse(e) ?? pcToolUse(e, tools)
}
