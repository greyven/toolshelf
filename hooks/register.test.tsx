import { expect, test } from 'claude-code/testing'

import { keywordsOf, literalKeyword, withKeywords } from './fiches'
import { suggestionsFor } from './suggest'

// Le répertoire de fiches livré avec le mod, réduit à deux fiches recopiées de fiches/fr.json (les tests ne lisent pas le disque).
const DECK = {"llm-council": {"mode": "actif", "what": "Faire débattre cinq conseillers IA sur une décision", "how": "Tu le lances avec une phrase déclencheur. Claude peut aussi le proposer seul sur un vrai choix. Onze appels de modèle par session ; écrit un rapport HTML et une transcription dans le dossier.", "why": "Tester un choix important contre la complaisance d'une réponse unique.", "when": "Vraie décision avec enjeux et plusieurs options, pas une question factuelle.", "ex": ["council this : PHP pur ou framework pour ce projet ?", "pressure-test this : mon plan en trois pages", "debate this : SQL ou fichiers JSON"], "trigger": "(dois-je|devrais-je|choisir|choix entre|hésite|quelle option|plutôt|ou bien|\\bvs\\b|versus|meilleure? (option|solution|approche)|décision|décider|trancher|conseil)", "hint": "Décision à trancher : « council this : … »."}, "ponytail": {"mode": "mixte", "what": "Écrire le moins de code possible", "how": "Passif : une fois activé, il s'applique tout seul à chaque réponse de code. Actif : les commandes de revue et d'audit se lancent à la main.\nNiveaux, à choisir dans sa bande au-dessus de la saisie ou avec /ponytail:ponytail <niveau> :\n• off : éteint, Claude travaille normalement.\n• lite : construit ce qui est demandé tel quel, et signale en une ligne une version plus simple si elle existe.\n• full (par défaut) : la plus petite modification qui résout entièrement le problème, sans option, abstraction ni dépendance non demandées.\n• ultra : comme full, et remet aussi en question la demande elle-même avant de construire.\nÀ tous les niveaux, rien de ce qui est demandé n'est sauté, ni la sécurité, ni ce qui protège les données.", "why": "Éviter le code superflu, les abstractions inutiles et les dépendances ajoutées pour quelques lignes.", "when": "Dès que tu écris, corriges ou refactores du code.", "ex": ["/ponytail:ponytail full   (lite, ultra, off)", "/ponytail:ponytail-review", "/ponytail:ponytail-audit", "/ponytail:ponytail-debt"], "trigger": "\\b(code|fonction|bug|corrig|refactor|simplifi|écri[st]|ajout|implémen|script|classe|méthode)", "hint": "Tu vas toucher du code : ponytail garde le changement minimal."}}
const isDeck = (p: string) => p.split(String.fromCharCode(92)).join('/').endsWith('/fiches/fr.json')

// La liste des outils sur PC livrée avec le mod (fiches/outils-pc.json), et un PATH qui contient la Unity CLI.
const PC_TOOLS = JSON.stringify([{ id: 'Unity CLI', program: 'unity', commands: ['unity --help'] }])
const isPcTools = (p: string) => p.split(String.fromCharCode(92)).join('/').endsWith('/fiches/outils-pc.json')
const envWithPath = (name: string) => (name === 'PATH' ? 'C:/U/bin;C:/U/AppData/Local/Microsoft/WindowsApps' : 'C:/U')

const PANE = {
  plugin: 'toolshelf',
  component: 'Pane',
  requestId: 'outils',
  props: {
    title: 'Mes Outils Installés',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

test('liste, surlignage et usage', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('command.list', () => ({
    value: [
      { name: 'ponytail:ponytail', description: 'Lazy dev', source: 'plugin', plugin: 'ponytail' },
      { name: 'llm-council', description: 'Council', source: 'user' },
      { name: 'nouveau', description: 'Un skill sans fiche', source: 'user' },
      { name: 'compact', description: 'builtin', source: 'builtin' },
    ],
  }))
  // Le fichier commun des réglages, simulé en mémoire ; stored en est la lecture.
  let file: string | undefined
  const stored = new Proxy({} as Record<string, unknown>, { get: (_, k: string) => (file ? JSON.parse(file)[k] : undefined) })
  on('env.get', () => ({ value: 'C:/Users/test' }))
  // Seul le fichier des réglages existe ici (pas de .claude.json ni de réserve de connecteurs).
  const isShared = (p: string) => p.endsWith('toolshelf-settings.json')
  on('fs.exists', (_, e) => ({ value: isDeck(e.path) || (isShared(e.path) && file !== undefined) }))
  on('fs.read', (_, e) => ({ value: isDeck(e.path) ? JSON.stringify(DECK) : isShared(e.path) ? file ?? '' : '' }))
  on('fs.write', (_, e) => { file = e.text; return { value: undefined } })
  on('store.get', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => e)
  on('skill.prompt', (_, e) => e)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'Dois-je choisir PHP pur ou un framework ?' })
  await $.skill.prompt({ skill: 'ponytail:ponytail', text: '', frontmatter: {}, source: 'plugin', pluginName: 'ponytail' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /PLUGINS · 1/ }))?.text).toBe('PLUGINS · 1')
    expect((await ui.find({ type: 'Text', text: /SKILLS · 2/ }))?.text).toBe('SKILLS · 2')
    expect(await ui.find({ type: 'Text', text: /Décision à trancher/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /utilisé/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /compact/ })).toBeFalsy()
    await ui.press({ key: 'nouveau' })
    expect(await ui.find({ type: 'Text', text: /Pas encore de fiche/ })).toBeTruthy()
    await ui.press({ key: 'nouveau' })

    // Réglages : masquer un outil et la légende, puis tout réafficher.
    await ui.press({ key: 'gear' })
    await ui.press({ key: 'show-nouveau' })
    await ui.press({ key: 'legend' })
    await ui.press({ key: 'gear' })
    expect(await ui.find({ type: 'Text', text: /2 outils affichés sur 3/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /agit tout seul/ })).toBeFalsy()
    expect((stored.prefs as { hidden: string[] }).hidden).toEqual(['nouveau'])
    await ui.press({ key: 'gear' })
    await ui.press({ key: 'all-on' })
    await ui.press({ key: 'legend' })
    await ui.press({ key: 'gear' })
    expect(await ui.find({ type: 'Text', text: /3 outils affichés sur 3/ })).toBeTruthy()

    // Sélecteur de couleur : clic sur le carré, clic dans le dégradé, puis saisie hexadécimale.
    await ui.press({ key: 'gear' })
    await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'sw-actif' })
    const color = () => (stored.prefs as { colors: Record<string, string> }).colors.actif
    if (surface === 'desktop') {
      // Dégradé vectoriel : une case = un pixel ici, pour viser précisément.
      await ui.resize({ columns: 264, rows: 160, in: 'ov-actif' })
      await ui.pointer({ type: 'down', x: 0, y: 0, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'ov-actif' })
      expect(color()).toMatch(/^#f[ef]f[ef]f[ef]$/)
      await ui.pointer({ type: 'down', x: 219, y: 0, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'up', x: 219, y: 0, button: 'left', in: 'ov-actif' })
      // Barre de teinte : à mi-hauteur, cyan.
      await ui.pointer({ type: 'down', x: 245, y: 80, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'move', x: 245, y: 80, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'up', x: 245, y: 80, button: 'left', in: 'ov-actif' })
      expect(color()).toMatch(/^#0[0-9a-f]f[0-9a-f]f[0-9a-f]$/)
      // Séquence réelle de l'application de bureau : pas de « down », des « move » bouton gauche puis « up ».
      await ui.pointer({ type: 'move', x: 100, y: 0, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'move', x: 0, y: 0, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'ov-actif' })
      expect(color()).toMatch(/^#f[ef]f[ef]f[ef]$/)
      // Glissé sorti par le coin bas/droite : la case du bord (son centre) est retenue, pas le noir pur du bord.
      await ui.pointer({ type: 'move', x: 10, y: 10, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'move', x: 500, y: 500, button: 'left', in: 'ov-actif' })
      await ui.pointer({ type: 'up', x: 500, y: 500, button: 'left', in: 'ov-actif' })
      expect(color()).not.toBe('#000000')
    } else {
      await ui.pointer({ type: 'down', x: 0, y: 0, button: 'left', in: 'pk-actif' })
      await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'pk-actif' })
      expect(color()).toBe('#ffffff')
    }
    await ui.input({ key: 'hex-actif', text: '5D79C0', kind: 'change' })
    expect((stored.prefs as { colors: Record<string, string> }).colors.actif).toBe('#5d79c0')
    expect(await ui.find({ type: 'Text', text: /#5d79c0/ })).toBeTruthy()
    await ui.press({ key: 'ok-actif' })
    await ui.press({ key: 'gear' })
    await ui.unmount()
  }
})

// Les fiches sont rédigées en arrière-plan : on attend que le nombre d'appels au modèle soit atteint.
const until = async (ok: () => boolean) => { for (let i = 0; i < 100 && !ok(); i++) await new Promise(r => setTimeout(r, 10)) }

test('fiche automatique et rafraîchissement par /tools', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  let tools = [{ name: 'nouveau', description: 'Converts videos', source: 'user' }]
  on('command.list', () => ({ value: tools }))
  // Le fichier commun des réglages, simulé en mémoire ; stored en est la lecture.
  let file: string | undefined
  const stored = new Proxy({} as Record<string, unknown>, { get: (_, k: string) => (file ? JSON.parse(file)[k] : undefined) })
  on('env.get', () => ({ value: 'C:/Users/test' }))
  // Seul le fichier des réglages existe ici (pas de .claude.json ni de réserve de connecteurs).
  const isShared = (p: string) => p.endsWith('toolshelf-settings.json')
  on('fs.exists', (_, e) => ({ value: isShared(e.path) && file !== undefined }))
  on('fs.read', (_, e) => ({ value: isShared(e.path) ? file ?? '' : '' }))
  on('fs.write', (_, e) => { file = e.text; return { value: undefined } })
  on('store.get', () => ({ value: undefined }))
  let asked = 0
  on('model.complete', () => {
    asked += 1
    const fiche = { mode: 'actif', what: 'Convertit des vidéos', how: 'Tu le lances.', why: 'Gagner du temps.', when: 'Pour une vidéo.', ex: ['/nouveau film.mp4'], trigger: 'vid[ée]o', hint: 'Une vidéo à convertir : /nouveau.' }
    return { value: { isAnswered: true, text: 'Voici : ' + JSON.stringify(fiche), usage: { input_tokens: 1, output_tokens: 1 } } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => e)
  on('command.run', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Les fiches rédigées sont rangées par langue dans le fichier commun.
  const ficheFr = () => (stored.fichesParLangue as Record<string, Record<string, { mode: string }>> | undefined)?.fr
  await until(() => !!ficheFr())
  expect(asked).toBe(1)
  expect(ficheFr()!.nouveau!.mode).toBe('actif')

  await $.prompt.submit({ text: 'Je dois raccourcir une vidéo' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Une vidéo à convertir/ })).toBeTruthy()
  await ui.press({ key: 'nouveau' })
  expect(await ui.find({ type: 'Text', text: /Régénérer la fiche/ })).toBeTruthy()
  await ui.press({ key: 'regen-nouveau' })
  await until(() => asked >= 2)
  expect(asked).toBe(2)

  // Un outil installé pendant la session apparaît après /tools, avec sa fiche.
  tools = [...tools, { name: 'autre', description: 'Another tool', source: 'user' }]
  await $.command.run({ command: 'tools' })
  expect(await ui.find({ type: 'Text', text: /SKILLS · 2/ })).toBeTruthy()
  await until(() => !!ficheFr()?.autre)
  expect(asked).toBe(3)
  await ui.unmount()
})

test('les réglages viennent du fichier commun, quelle que soit la discussion', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('command.list', () => ({ value: [] }))
  // Réglages laissés par une autre discussion, encore sous l'ancien nom du mod (boite-a-outils).
  const OLD = 'C:/Users/test/.claude/boite-a-outils-reglages.json'
  const NEW = 'C:/Users/test/.claude/toolshelf-settings.json'
  const disk: Record<string, string> = { [OLD]: JSON.stringify({ prefs: { bg: '#30251f', colors: { actif: '#123456' }, legend: false, hidden: [] } }) }
  const norm = (p: string) => p.split(String.fromCharCode(92)).join('/')
  on('env.get', () => ({ value: 'C:/Users/test' }))
  on('fs.exists', (_, e) => ({ value: norm(e.path) in disk }))
  on('fs.read', (_, e) => ({ value: disk[norm(e.path)] ?? '' }))
  on('fs.write', (_, e) => { disk[norm(e.path)] = e.text; return { value: undefined } })
  on('store.get', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/autre-projet', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /agit tout seul/ })).toBeFalsy()
  await ui.press({ key: 'gear' })
  expect(await ui.find({ type: 'Text', text: /#30251f/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /#123456/ })).toBeTruthy()
  await ui.press({ key: 'legend' })
  // Les réglages sont recopiés sous le nouveau nom ; l'ancien fichier reste intact.
  expect(JSON.parse(disk[NEW]!).prefs.legend).toBe(true)
  expect(JSON.parse(disk[OLD]!).prefs.legend).toBe(false)
  // La langue se choisit dans les réglages et se garde dans le fichier commun.
  await ui.press({ key: 'lang-en' })
  expect(await ui.find({ type: 'Text', text: '✕ Close' })).toBeTruthy()
  expect(JSON.parse(disk[NEW]!).prefs.lang).toBe('en')
  await ui.press({ key: 'lang-fr' })
  expect(await ui.find({ type: 'Text', text: '✕ Fermer' })).toBeTruthy()
  await ui.unmount()
})

test('la case à cocher active et désactive plugins et skills', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.list', () => ({
    value: [
      { name: 'ponytail:ponytail', description: 'Lazy dev', source: 'plugin', plugin: 'ponytail' },
      { name: 'llm-council', description: 'Council', source: 'user' },
    ],
  }))
  const files: Record<string, string> = {
    'C:/U/.claude/plugins/installed_plugins.json': JSON.stringify({ plugins: { 'ponytail@ponytail': [{}], 'rea@rea': [{}] } }),
    'C:/U/.claude/settings.json': JSON.stringify({ enabledPlugins: { 'ponytail@ponytail': true, 'rea@rea': false } }),
  }
  const norm = (p: string) => p.split(String.fromCharCode(92)).join('/')
  let os: string | undefined = 'Windows_NT'
  on('env.get', (_, e) => ({ value: e.name === 'OS' ? os : 'C:/U' }))
  on('fs.exists', (_, e) => ({ value: norm(e.path) in files || norm(e.path).endsWith('/skills') }))
  on('fs.read', (_, e) => ({ value: files[norm(e.path)] ?? '' }))
  on('fs.write', (_, e) => { files[norm(e.path)] = e.text; return { value: undefined } })
  on('fs.list', (_, e) => ({ value: norm(e.path).endsWith('/skills') ? [{ name: 'llm-council', kind: 'dir' }] : [] }))
  on('store.get', () => ({ value: undefined }))
  const runs: string[][] = []
  on('process.run', (_, e) => { runs.push([...e.argv]); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  // rea, désactivé, reste visible pour pouvoir être réactivé.
  expect(await ui.find({ type: 'Text', text: /^désactivé$/ })).toBeTruthy()
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'chk-ponytail' })
  expect(runs.at(-1)!.slice(1)).toEqual(['plugin', 'disable', 'ponytail@ponytail', '--scope', 'user'])
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'chk-rea' })
  expect(runs.at(-1)!.slice(1, 3)).toEqual(['plugin', 'enable'])
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'chk-llm-council' })
  expect(runs.at(-1)![0]).toBe('powershell')
  expect(runs.at(-1)!.at(-1)).toContain('skills-desactives')
  // Hors Windows : mkdir puis mv, sans PowerShell.
  os = undefined
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'chk-llm-council' })
  expect(runs.at(-2)).toEqual(['mkdir', '-p', 'C:/U/.claude/skills'])
  expect(runs.at(-1)).toEqual(['mv', 'C:/U/.claude/skills-desactives/llm-council', 'C:/U/.claude/skills/'])
  await ui.unmount()
})

test('la case d’un connecteur le met en réserve puis le remet à l’identique', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.list', () => ({ value: [] }))
  on('tool.list', () => ({ value: [{ name: 'mcp__rea__open_binary', description: '', mcp: true }] }))
  const cfg = { type: 'stdio', command: 'node', args: ['rea.mjs', 'mcp'] }
  const files: Record<string, string> = { 'C:/U/.claude.json': JSON.stringify({ mcpServers: { rea: cfg } }) }
  const norm = (p: string) => p.split(String.fromCharCode(92)).join('/')
  on('env.get', () => ({ value: 'C:/U' }))
  on('fs.exists', (_, e) => ({ value: norm(e.path) in files }))
  on('fs.read', (_, e) => ({ value: files[norm(e.path)] ?? '' }))
  on('fs.write', (_, e) => { files[norm(e.path)] = e.text; return { value: undefined } })
  on('fs.list', () => ({ value: [] }))
  on('store.get', () => ({ value: undefined }))
  const runs: string[][] = []
  on('process.run', (_, e) => { runs.push([...e.argv]); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const RESERVE = 'C:/U/.claude/toolshelf-disabled-connectors.json'
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'chk-rea' })
  expect(runs.at(-1)!.slice(1)).toEqual(['mcp', 'remove', 'rea', '--scope', 'user'])
  expect(JSON.parse(files[RESERVE]!).rea).toEqual(cfg)
  await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: 'chk-rea' })
  expect(runs.at(-1)!.slice(1)).toEqual(['mcp', 'add-json', 'rea', JSON.stringify(cfg), '--scope', 'user'])
  expect(JSON.parse(files[RESERVE]!)).toEqual({})
  await ui.unmount()
})

test('actualisation, connecteurs et outils de l’ordinateur', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  let cmds: { name: string; description: string; source: string; plugin?: string }[] = []
  on('command.list', () => ({ value: cmds }))
  on('tool.list', () => ({
    value: [
      { name: 'mcp__rea__open_binary', description: '', mcp: true },
      { name: 'mcp__1a59c906-04da-521d-bda7-7f71b9f9e01c__read', description: '', mcp: true },
      { name: 'mcp__ccd_session__start', description: '', mcp: true },
      { name: 'Bash', description: '', mcp: false },
    ],
  }))
  const norm = (p: string) => p.split(String.fromCharCode(92)).join('/')
  // Le nom d'un connecteur claude.ai vient de l'application de bureau.
  on('mcp.call', () => ({
    value: { isError: false, content: [{ type: 'text', text: JSON.stringify({ servers: [{ name: 'Claude Docs', id: '1a59c906-04da-521d-bda7-7f71b9f9e01c', kind: 'connector' }] }) }] },
  }))
  on('env.get', (_, e) => ({ value: envWithPath(e.name) }))
  on('fs.exists', (_, e) => ({ value: isPcTools(e.path) }))
  on('fs.list', (_, e) => ({ value: norm(e.path).endsWith('WindowsApps') ? [{ name: 'unity.exe', kind: 'file' }] : [] }))
  on('fs.read', (_, e) => ({ value: isPcTools(e.path) ? PC_TOOLS : '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /CONNECTEURS · 2/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /^Claude Docs$/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /^Unity CLI$/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /SUR PC · 1/ })).toBeTruthy()
  // Une section se plie et se déplie.
  await ui.press({ key: 'sec-connecteur' })
  expect(await ui.find({ type: 'Text', text: /^Claude Docs$/ })).toBeFalsy()
  await ui.press({ key: 'sec-connecteur' })
  expect(await ui.find({ type: 'Text', text: /^Claude Docs$/ })).toBeTruthy()
  // Un plugin installé après le démarrage apparaît au clic sur Actualiser.
  cmds = [{ name: 'unity:ui', description: 'UI', source: 'plugin', plugin: 'unity' }]
  await ui.press({ key: 'refresh' })
  expect(await ui.find({ type: 'Text', text: /PLUGINS · 1/ })).toBeTruthy()
  await ui.unmount()
})

test('un module en cours d’utilisation est surligné', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('command.list', () => ({ value: [] }))
  on('tool.list', () => ({ value: [{ name: 'mcp__rea__open_binary', description: '', mcp: true }] }))
  const norm = (p: string) => p.split(String.fromCharCode(92)).join('/')
  on('env.get', (_, e) => ({ value: envWithPath(e.name) }))
  on('fs.exists', (_, e) => ({ value: isPcTools(e.path) }))
  on('fs.list', (_, e) => ({ value: norm(e.path).endsWith('WindowsApps') ? [{ name: 'unity.exe', kind: 'file' }] : [] }))
  on('fs.read', (_, e) => ({ value: isPcTools(e.path) ? PC_TOOLS : '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.submit', (_, e) => e)
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__rea__open_binary', path: 'a.exe' })
  // Le nom « unity » ailleurs que comme commande lancée ne compte pas.
  await $.tool.call({ tool: 'PowerShell', command: 'Get-Command unity -ErrorAction SilentlyContinue; ls C:/cache/unity/0.1' })
  await $.tool.call({ tool: 'Bash', command: 'cd /x && unity editors' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /En cours d'utilisation : open_binary/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /En cours d'utilisation : cd \/x && unity editors/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Get-Command/ })).toBeFalsy()
  // Demande suivante : la réponse précédente est finie, le surlignage d'utilisation disparaît.
  await $.prompt.submit({ text: 'merci' })
  expect(await ui.find({ type: 'Text', text: /En cours d'utilisation/ })).toBeFalsy()
  await ui.unmount()
})

test('la bande propose les outils utiles pendant la frappe, et se vide à l’envoi', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('command.list', () => ({ value: [{ name: 'llm-council', description: 'Council', source: 'user' }] }))
  on('env.get', () => ({ value: 'C:/Users/test' }))
  on('fs.exists', (_, e) => ({ value: isDeck(e.path) }))
  on('fs.read', (_, e) => ({ value: isDeck(e.path) ? JSON.stringify(DECK) : '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.change', (_, e) => e)
  on('prompt.submit', (_, e) => e)
  // Rien ne dessine sous le mod dans un test : ce dessin tient la place de celui de l'application.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>application</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const BAND = { plugin: 'toolshelf', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10 }, surface: 'desktop' } as const
  await $.prompt.change({ text: 'Je ne sais pas quoi choisir entre deux moteurs', cursor: 10, origin: { kind: 'history' } } as never)
  let band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /llm-council/ })).toBeTruthy()
  await band.unmount()

  // L'envoi suffit à vider la bande, sans signal de zone vidée (comme dans l'application de bureau).
  await $.prompt.submit({ text: 'Je ne sais pas quoi choisir entre deux moteurs' })
  band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /llm-council/ })).toBeFalsy()
  await band.unmount()
})

test('un outil nommé est suggéré, et un mot-clé ne compte pas au milieu d’un mot', async () => {
  const present = new Set(['llm-council', 'ponytail', 'graphify', 'rea', 'agent-skills', 'Unity CLI', 'Claude Docs'])
  const ids = (t: string) => Object.keys(suggestionsFor(t, present, DECK))
  expect(ids('Peut-être que si je demande au conseil sa décision ?')).toContain('llm-council')
  expect(ids('Peut etre llm ?')).toContain('llm-council')
  expect(ids('Voyons si agent ou skills ou ponytail font qqc')).toEqual(expect.arrayContaining(['agent-skills', 'ponytail']))
  expect(ids('graphify non plus, ni rea')).toEqual(expect.arrayContaining(['graphify', 'rea']))
  // « réagit » ne contient pas l'outil rea ; « claude » seul ne désigne pas Claude Docs.
  expect(ids('roblox réagit, je parle à claude')).toEqual([])
  // Le nom passe avant les mots-clés.
  expect(ids('je dois choisir, ponytail ?')[0]).toBe('ponytail')
})

test('les mots-clés d’une fiche se lisent, se modifient et se réécrivent en regex', async () => {
  expect(keywordsOf(String.raw`\b(code|fonction|écri[st]|où (est|se trouve))`)).toEqual(['code', 'fonction', 'écri[st]', 'où (est|se trouve)'])
  expect(keywordsOf(String.raw`\bunity\b`)).toEqual(['unity'])
  expect(keywordsOf(String.raw`(pdf|\bword\b|cré\w* un skill)`)).toEqual(['pdf', 'word', String.raw`cré\w* un skill`])
  expect(keywordsOf('(?!)')).toEqual([])
  expect(literalKeyword(' C++ ')).toBe(String.raw`c\+\+`)
  const cards = withKeywords(DECK, { 'llm-council': ['arbitrer', literalKeyword('c++')] })
  expect(cards['llm-council']!.trigger).toBe(String.raw`(arbitrer|c\+\+)`)
  const present = new Set(['llm-council'])
  expect(Object.keys(suggestionsFor('Il faut arbitrer', present, cards))).toEqual(['llm-council'])
  expect(Object.keys(suggestionsFor('Quelle décision prendre ?', present, cards))).toEqual([])
})

test('les mots-clés d’une carte se modifient dans les réglages et changent les suggestions', async ($, on) => {
  on('command.register', () => ({ value: { command: 'tools' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('command.list', () => ({ value: [{ name: 'llm-council', description: 'Council', source: 'user' }] }))
  let file: string | undefined
  const isShared = (p: string) => p.endsWith('toolshelf-settings.json')
  on('env.get', () => ({ value: 'C:/Users/test' }))
  on('fs.exists', (_, e) => ({ value: isDeck(e.path) || (isShared(e.path) && file !== undefined) }))
  on('fs.read', (_, e) => ({ value: isDeck(e.path) ? JSON.stringify(DECK) : isShared(e.path) ? file ?? '' : '' }))
  on('fs.write', (_, e) => { file = e.text; return { value: undefined } })
  on('store.get', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => e)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'gear' })
  await ui.press({ key: 'kw-llm-council' })
  expect(await ui.find({ type: 'Text', text: ' choisir ✕ ' })).toBeTruthy()
  const saved = () => JSON.parse(file!).prefs.keywords.fr['llm-council'] as string[]
  // Retirer « choisir », puis ajouter « arbitrer ».
  const before = (await ui.findAll({ type: 'Text', text: / ✕ $/ })).length
  const i = keywordsOf(DECK['llm-council'].trigger).indexOf('choisir')
  await ui.press({ key: `kw-del-llm-council-${i}` })
  expect(saved()).not.toContain('choisir')
  expect(saved().length).toBe(before - 1)
  await ui.input({ key: 'kw-add-llm-council', text: 'Arbitrer', kind: 'submit' })
  expect(saved().at(-1)).toBe('arbitrer')
  // La suggestion suit les nouveaux mots-clés.
  await $.prompt.submit({ text: 'Il faut arbitrer' })
  await ui.press({ key: 'gear' })
  expect(await ui.find({ type: 'Text', text: /Décision à trancher/ })).toBeTruthy()
  await $.prompt.submit({ text: 'Je dois choisir' })
  expect(await ui.find({ type: 'Text', text: /Décision à trancher/ })).toBeFalsy()
  // Retour aux mots-clés d'origine.
  await ui.press({ key: 'gear' })
  await ui.press({ key: 'kw-reset-llm-council' })
  expect(JSON.parse(file!).prefs.keywords.fr['llm-council']).toBeUndefined()
  await ui.unmount()
})
