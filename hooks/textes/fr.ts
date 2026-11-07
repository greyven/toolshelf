// Textes du panneau en français. en.ts reprend exactement les mêmes clés.
export const fr = {
  paneTitle: 'Mes Outils Installés',
  commandDescription: 'Ouvrir le panneau des plugins et skills',
  commandDone: 'Panneau des outils ouvert et liste mise à jour.',

  // En-tête
  settingsIntro: 'Réglages du panneau, gardés pour tes prochaines sessions.',
  toolsIntro: (shown: number, all: number) => `${shown} outils affichés sur ${all}. Clique une carte pour l'ouvrir.`,
  refresh: '↻ Actualiser',
  refreshed: 'Liste des outils actualisée.',
  close: '✕ Fermer',
  settings: '⚙ Réglages',

  // Réglages
  language: 'Langue',
  background: 'Fond du panneau',
  clickSwatch: 'Clique un carré pour ouvrir le sélecteur de couleur.',
  backgroundColor: 'Couleur de fond',
  themeReset: '↺ thème',
  theme: '(thème)',
  tagColors: 'Couleurs des étiquettes',
  resetColors: '↺ Couleurs par défaut',
  display: 'Affichage',
  showLegend: 'Afficher la légende',
  shownTools: (shown: number, all: number) => `Outils affichés · ${shown}/${all}`,
  checkAll: 'Tout cocher',
  uncheckAll: 'Tout décocher',
  keywords: 'Mots-clés de déclenchement',
  keywordsHelp: "Un mot-clé tapé dans ta demande fait suggérer l'outil (début de mot suffit). Clique ✕ pour en retirer un.",
  addKeyword: 'Ajouter un mot-clé',
  resetKeywords: "↺ Mots-clés d'origine",
  noKeyword: 'Aucun mot-clé : seul le nom de l’outil le fait suggérer.',
  pickerAlt: 'Sélecteur de couleur',
  chosenColor: 'Couleur choisie',

  // Étiquettes : nom affiché et sens dans la légende
  tints: {
    passif: ['passif', 'agit tout seul'],
    actif: ['actif', 'tu le lances'],
    mixte: ['mixte', 'les deux'],
    hot: ['surligné', 'utile pour ta demande'],
  } as Record<'passif' | 'actif' | 'mixte' | 'hot', [name: string, meaning: string]>,
  kinds: { plugin: 'plugin', skill: 'skill', connecteur: 'connecteur', outil: 'outil' },
  sections: { plugin: 'Plugins', skill: 'Skills', connecteur: 'Connecteurs', outil: 'Sur PC' },

  // Cartes
  unclassified: ' à classer ',
  disabled: 'désactivé',
  used: '✓ utilisé',
  checkedAlt: 'Case cochée',
  uncheckedAlt: 'Case décochée',
  howTo: "Mode d'emploi",
  why: 'Pourquoi',
  when: 'Quand',
  examples: 'Exemples',
  writing: 'Fiche en cours de rédaction…',
  noCard: 'Pas encore de fiche.',
  regenerate: '↻ Régénérer la fiche (rédigée automatiquement)',
  writeCard: '↻ Rédiger la fiche',
  commands: 'Commandes disponibles',
  andMore: (n: number) => `… et ${n} autres`,
  pluginSummary: (n: number) => `${n} skills ou commandes`,
  inUse: "● En cours d'utilisation : ",
  noneShown: 'Aucun outil affiché. Coche-en dans ⚙ Réglages.',
  groupCount: (n: number) => `${n} outils`,
  groupSummary: (on: number, n: number) => `${on} activés sur ${n}. Déplie pour voir chaque outil.`,

  // Recensement
  installedLater: 'Installé : disponible dans les nouvelles discussions.',
  pluginOff: 'Plugin désactivé.',
  skillOff: 'Skill désactivé.',
  connectorTools: (n: number) => `${n} outils fournis à Claude.`,
  connectorOff: 'Connecteur désactivé.',
  pcProgram: (program: string) => `Programme « ${program} » installé sur l'ordinateur.`,

  // Cases d'activation
  toggled: (id: string, on: boolean) => `${id} ${on ? 'activé' : 'désactivé'} : prend effet dans les nouvelles discussions.`,
  toggleFailed: (id: string, on: boolean) => `Impossible de ${on ? 'activer' : 'désactiver'} ${id}.`,
  groupPartly: (id: string, on: boolean, done: number, n: number) =>
    `${id} : ${done} sur ${n} ${on ? 'activés' : 'désactivés'}, les autres n'ont pas pu l'être.`,
  notHere: (id: string) =>
    `${id} est fourni par claude.ai ou par le projet : il se désactive dans claude.ai (Paramètres, Capacités) ou dans le dossier du projet.`,

  // Bande de suggestions
  suggestions: 'SUGGESTIONS',
  ruleAlt: 'Séparation entre ponytail et les suggestions',

  // Fiches rédigées par le modèle
  ficheSystem:
    'Tu rédiges des fiches courtes en français pour un panneau qui présente des outils de Claude Code à un débutant. Réponds uniquement par un objet JSON, sans texte autour.',
  fichePrompt: (id: string, kind: string, desc: string, commands: string) => `Outil : ${id} (${kind})
Description fournie par l'outil : ${desc}
Commandes : ${commands}

Réponds par ce JSON :
{"mode": "passif" | "actif" | "mixte", "what": "ce qu'il fait, une phrase de 10 mots au plus", "how": "mode d'emploi, 2 phrases : ce qui s'exécute tout seul et ce que l'utilisateur lance", "why": "pourquoi l'utiliser, une phrase", "when": "quand l'utiliser, une phrase", "ex": ["2 à 4 exemples : commandes de la liste ou demandes à taper"], "trigger": "regex JavaScript de mots-clés français et anglais qui signalent une demande où l'outil est utile, sans délimiteurs", "hint": "conseil de 12 mots au plus affiché quand l'outil devient utile"}
passif = agit tout seul, actif = l'utilisateur le lance, mixte = les deux.`,
}

export type Textes = typeof fr
