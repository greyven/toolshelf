// key : identifiant pour activer/désactiver (« nom@marketplace » d'un plugin, dossier d'un skill personnel) ;
// absent quand l'outil n'est pas géré depuis le panneau (plugin d'organisation, skill de projet).
// program : pour un outil sur PC, le nom du programme dont le lancement le met « en cours ».
// server : pour un connecteur, le nom de son serveur dans les noms d'outils (mcp__<server>__…).
// group : nom du groupe (fiches/groupes.json) dont l'outil fait partie ; ses membres partagent une seule carte.
export type Found = { id: string; kind: 'plugin' | 'skill' | 'outil' | 'connecteur'; desc: string; commands: string[]; key?: string; enabled: boolean; program?: string; server?: string; group?: string }

// Un outil sur PC à chercher, décrit dans fiches/outils-pc.json.
export type PcTool = { id: string; program: string; commands?: string[] }

// Des outils réunis dans une seule carte (même auteur, même famille), décrits dans fiches/groupes.json.
export type ToolGroup = { id: string; members: string[] }

export type Tint = 'passif' | 'actif' | 'mixte' | 'hot'

// Fiche d'un outil, livrée avec le mod (fiches/<langue>.json) ou rédigée par le modèle ; trigger est le texte d'une regex.
export type AutoInfo = {
  mode: 'passif' | 'actif' | 'mixte'
  what: string
  how: string
  why: string
  when: string
  ex: string[]
  trigger: string
  hint: string
}

// Une version du mod dans changelog.json : ce qui change, par langue.
export type ChangelogEntry = { version: string } & Partial<Record<Lang, string[]>>

// Une version plus récente publiée sur GitHub : de quelle version à laquelle, le nom d'installation, et ce qui change.
export type UpdateOffer = { from: string; to: string; key: string; notes: string[]; status: 'offered' | 'installing' | 'done' | 'closed' }

// Langues traduites : hooks/textes/<langue>.ts et fiches/<langue>.json.
export type Lang = 'fr' | 'en'

export type Prefs = {
  lang: Lang
  legend: boolean
  folded?: string[]
  hidden: string[]
  // Mots-clés de déclenchement modifiés par l'utilisateur, par langue puis par outil ; ils remplacent ceux de la fiche.
  keywords?: Partial<Record<Lang, Record<string, string[]>>>
  // Version proposée puis ignorée : la fenêtre ne revient qu'avec une version plus récente.
  ignoredUpdate?: string
}

declare module 'claude-code' {
  interface PluginState {
    'toolshelf': {
      open: string | null
      hot: Record<string, string>
      used: Record<string, string>
      active: Record<string, string>
      found: Found[]
      prefs: Prefs
      settings: boolean
      auto: Record<string, AutoInfo>
      // Répertoire de fiches livré avec le mod, relu à chaque recensement.
      livrees: Record<string, AutoInfo>
      generating: string[]
      // Outil dont les mots-clés sont dépliés dans les réglages.
      kwOpen: string | null
      // Groupes dépliés : dans le panneau (nom du groupe) et dans les réglages (« reglages: » + nom).
      opened: string[]
      // Mise à jour proposée dans la fenêtre en haut du panneau (update.ts).
      update: UpdateOffer | null
      // Bande de suggestions (band.tsx) : texte en cours de frappe, et nombre de frappes reçues (gardé pour plus tard).
      draft: string
      draftEdits: number
    }
  }
}
