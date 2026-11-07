// Panel texts in English. Same keys as fr.ts.
import type { Textes } from './fr'

export const en: Textes = {
  paneTitle: 'My Installed Tools',
  commandDescription: 'Open the plugins and skills panel',
  commandDone: 'Tools panel opened and list refreshed.',

  settingsIntro: 'Panel settings, kept for your next sessions.',
  toolsIntro: (shown, all) => `${shown} of ${all} tools shown. Click a card to open it.`,
  refresh: '↻ Refresh',
  refreshed: 'Tool list refreshed.',
  close: '✕ Close',
  settings: '⚙ Settings',

  language: 'Language',
  background: 'Panel background',
  clickSwatch: 'Click a square to open the color picker.',
  backgroundColor: 'Background color',
  themeReset: '↺ theme',
  theme: '(theme)',
  tagColors: 'Tag colors',
  resetColors: '↺ Default colors',
  display: 'Display',
  showLegend: 'Show the legend',
  shownTools: (shown, all) => `Tools shown · ${shown}/${all}`,
  checkAll: 'Check all',
  uncheckAll: 'Uncheck all',
  keywords: 'Trigger keywords',
  keywordsHelp: 'A keyword typed in your request makes the tool suggested (the start of a word is enough). Click ✕ to remove one.',
  addKeyword: 'Add a keyword',
  resetKeywords: '↺ Original keywords',
  noKeyword: "No keyword: only the tool's name makes it suggested.",
  pickerAlt: 'Color picker',
  chosenColor: 'Chosen color',

  tints: {
    passif: ['passive', 'acts on its own'],
    actif: ['active', 'you launch it'],
    mixte: ['mixed', 'both'],
    hot: ['highlighted', 'useful for your request'],
  },
  kinds: { plugin: 'plugin', skill: 'skill', connecteur: 'connector', outil: 'tool' },
  sections: { plugin: 'Plugins', skill: 'Skills', connecteur: 'Connectors', outil: 'On this computer' },

  unclassified: ' unclassified ',
  disabled: 'disabled',
  used: '✓ used',
  checkedAlt: 'Checked box',
  uncheckedAlt: 'Unchecked box',
  howTo: 'How to use',
  why: 'Why',
  when: 'When',
  examples: 'Examples',
  writing: 'Writing the card…',
  noCard: 'No card yet.',
  regenerate: '↻ Rewrite the card (written automatically)',
  writeCard: '↻ Write the card',
  commands: 'Available commands',
  andMore: n => `… and ${n} more`,
  pluginSummary: n => `${n} skills or commands`,
  inUse: '● In use: ',
  noneShown: 'No tool shown. Check some in ⚙ Settings.',
  groupCount: n => `${n} tools`,
  groupSummary: (on, n) => `${on} of ${n} enabled. Open it to see each tool.`,

  installedLater: 'Installed: available in new conversations.',
  pluginOff: 'Plugin disabled.',
  skillOff: 'Skill disabled.',
  connectorTools: n => `${n} tools provided to Claude.`,
  connectorOff: 'Connector disabled.',
  pcProgram: program => `Program "${program}" installed on this computer.`,

  toggled: (id, on) => `${id} ${on ? 'enabled' : 'disabled'}: takes effect in new conversations.`,
  toggleFailed: (id, on) => `Could not ${on ? 'enable' : 'disable'} ${id}.`,
  groupPartly: (id, on, done, n) => `${id}: ${done} of ${n} ${on ? 'enabled' : 'disabled'}, the others could not be.`,
  notHere: id => `${id} is provided by claude.ai or by the project: disable it in claude.ai (Settings, Capabilities) or in the project folder.`,

  suggestions: 'SUGGESTIONS',
  ruleAlt: 'Separator between ponytail and the suggestions',

  ficheSystem:
    'You write short cards in English for a panel that introduces Claude Code tools to a beginner. Answer only with a JSON object, with no text around it.',
  fichePrompt: (id, kind, desc, commands) => `Tool: ${id} (${kind})
Description given by the tool: ${desc}
Commands: ${commands}

Answer with this JSON:
{"mode": "passif" | "actif" | "mixte", "what": "what it does, one sentence of 10 words at most", "how": "how to use it, 2 sentences: what runs on its own and what the user launches", "why": "why use it, one sentence", "when": "when to use it, one sentence", "ex": ["2 to 4 examples: commands from the list or requests to type"], "trigger": "JavaScript regex of English keywords that signal a request where the tool is useful, without delimiters", "hint": "tip of 12 words at most shown when the tool becomes useful"}
passif = acts on its own, actif = the user launches it, mixte = both.`,
}
