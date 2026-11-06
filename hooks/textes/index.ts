// Les textes dans la langue choisie. Ajouter une langue : un fichier comme en.ts, une entrée ici et dans Lang (types/index.d.ts),
// et fiches/<langue>.json.
import type { Lang } from '../../types'

import { en } from './en'
import { fr, type Textes } from './fr'

export type { Textes }

export const LANGS: Record<Lang, Textes> = { fr, en }
export type { Lang }
export const LANG_NAMES: Record<Lang, string> = { fr: 'Français', en: 'English' }

export function textes(lang: Lang | undefined): Textes {
  return LANGS[lang ?? 'fr'] ?? fr
}

// La langue du système (fr-FR → fr), anglais si elle n'est pas traduite.
export function systemLang(): Lang {
  try {
    const code = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2)
    return code in LANGS ? (code as Lang) : 'en'
  } catch {
    return 'en'
  }
}
