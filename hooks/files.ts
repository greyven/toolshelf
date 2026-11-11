// Accès aux fichiers du profil : chemins et lectures tolérantes (un fichier absent ou illisible ne casse rien).
import type { EngineInterface } from 'claude-code'

export type Dollar = EngineInterface

export async function homeDir($: Dollar) {
  return (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
}

export async function claudeDir($: Dollar) {
  return `${await homeDir($)}/.claude`
}

// Le mod s'appelait « boite-a-outils » : son fichier d'avant est recopié sous le nouveau nom à la première lecture.
// L'ancien fichier reste en place, rien n'est effacé.
async function renamedFile($: Dollar, name: string, oldName: string) {
  const dir = await claudeDir($)
  const path = `${dir}/${name}`
  const old = `${dir}/${oldName}`
  if (!(await $.fs.exists(path)) && (await $.fs.exists(old))) await $.fs.write(path, await $.fs.read(old))
  return path
}

// Réglages communs à toutes les discussions ($.store est propre à chaque copie du mod).
export async function sharedPath($: Dollar) {
  return renamedFile($, 'toolshelf-settings.json', 'boite-a-outils-reglages.json')
}

// Configurations des connecteurs décochés, pour les remettre à l'identique.
export async function reservePath($: Dollar) {
  return renamedFile($, 'toolshelf-disabled-connectors.json', 'connecteurs-desactives.json')
}

export async function isWindows($: Dollar) {
  return (await $.env.get('OS')) === 'Windows_NT'
}

// L'installation officielle met claude dans ~/.local/bin (claude.exe sous Windows) ; sinon, celui du PATH.
// Sans elle, sous Windows, la copie livrée avec l'application de bureau : Claude-Data\<app>\claude-code\<version>\<id>\claude.exe.
export async function claudeExe($: Dollar) {
  const win = await isWindows($)
  const local = `${await homeDir($)}/.local/bin/claude${win ? '.exe' : ''}`
  if (await $.fs.exists(local)) return local
  return (win && (await desktopClaude($))) || 'claude'
}

// shortcut: chemin de l'application de bureau Windows observé en novembre 2026 ; à revoir si l'application change de dossier.
async function desktopClaude($: Dollar) {
  const data = `${(await $.env.get('LOCALAPPDATA')) ?? ''}/Claude-Data`
  for (const app of await listDirs($, data)) {
    const base = `${data}/${app}/claude-code`
    const versions = (await listDirs($, base)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    for (const ver of versions) {
      for (const id of await listDirs($, `${base}/${ver}`)) {
        const exe = `${base}/${ver}/${id}/claude.exe`
        if (await $.fs.exists(exe)) return exe
      }
    }
  }
  return undefined
}

export async function readJson($: Dollar, path: string): Promise<any> {
  try {
    return (await $.fs.exists(path)) ? JSON.parse(await $.fs.read(path)) : undefined
  } catch {
    return undefined
  }
}

export async function writeJson($: Dollar, path: string, value: unknown) {
  await $.fs.write(path, JSON.stringify(value, null, 2))
}

export async function listDirs($: Dollar, path: string): Promise<string[]> {
  try {
    return (await $.fs.exists(path)) ? (await $.fs.list(path)).filter(e => e.kind === 'dir').map(e => e.name) : []
  } catch {
    return []
  }
}

export async function listNames($: Dollar, path: string): Promise<string[]> {
  try {
    return (await $.fs.list(path)).map(e => e.name.toLowerCase())
  } catch {
    return []
  }
}
