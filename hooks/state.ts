// Constantes du panneau. Les valeurs de la discussion (atomes) sont déclarées dans chaque fichier qui les lit :
// le moteur des mods exige que read et update désignent un atome écrit dans le fichier même (types/index.d.ts les liste).

import type { Prefs } from '../types'

import { systemLang } from './textes'

export const ME = 'toolshelf'
export const PANE = 'outils'
// Cible de la case d'activation d'un groupe : ce préfixe suivi du nom du groupe.
export const GROUP = 'groupe:'

export const DEFAULTS: Prefs = {
  lang: systemLang(),
  bg: null,
  colors: { passif: '#4caf50', actif: '#5ba3e8', mixte: '#e0a020', hot: '#7b5bbf' },
  legend: true,
  hidden: [],
}
