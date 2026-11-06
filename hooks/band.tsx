// Bande de suggestions au-dessus de la zone de saisie : elle suit la frappe et propose les outils utiles
// pour le texte en cours, avant même l'envoi. Vide quand rien ne correspond.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { inkOn } from './colors'
import type { Dollar } from './files'
import { DEFAULTS } from './state'
import { withKeywords } from './fiches'
import { suggestionsFor } from './suggest'
import { textes } from './textes'

const draft = atom({ plugin: 'toolshelf', key: 'draft' } as const, '')
const draftEdits = atom({ plugin: 'toolshelf', key: 'draftEdits' } as const, 0)
const found = atom({ plugin: 'toolshelf', key: 'found' } as const, [])
const auto = atom({ plugin: 'toolshelf', key: 'auto' } as const, {})
const livrees = atom({ plugin: 'toolshelf', key: 'livrees' } as const, {})
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)

// Trait fin repris de ponytail (hooks/band/metrics.ts) : gris foncé à 12 % en thème clair, blanc à 14 % en thème sombre.
// Comme chez ponytail, le trait est en haut d'une image plus haute : sa hauteur fait aussi l'espace avant le cadre.
const RULE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="14" viewBox="0 0 720 14">' +
  '<style>.d{stroke:#1f1e1d;stroke-opacity:.12}@media (prefers-color-scheme:dark){.d{stroke:#fff;stroke-opacity:.14}}</style>' +
  '<line class="d" x1="0" y1="0.5" x2="720" y2="0.5"/></svg>'

// L'envoi vide la bande : l'application de bureau ne signale pas que la zone de saisie s'est vidée (vu à l'essai).
// Appelé par le branchement de prompt.submit de register.tsx (un seul branchement par événement est permis).
export async function clearBand($: Dollar) {
  await update($, draft, () => '')
}

export const registerBand: Register = on => {
  // Chaque frappe ou collage dans la zone de saisie.
  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    await update($, draft, () => box.text)
    await update($, draftEdits, n => (n ?? 0) + 1)
    return box
  })

  // Les autres changements : rappel de l'historique, effacement.
  on('prompt.change', async ($, e, next) => {
    await update($, draft, () => e.text)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const text = (await read($, draft)) ?? ''
    const tools = (await read($, found)) ?? []
    const disabled = new Set(tools.filter(f => !f.enabled).map(f => f.id))
    const p = (await read($, prefs)) ?? DEFAULTS
    const cards = withKeywords({ ...((await read($, auto)) ?? {}), ...((await read($, livrees)) ?? {}) }, p.keywords?.[p.lang])
    const shown = Object.entries(suggestionsFor(text, new Set(tools.map(f => f.id)), cards))
    if (shown.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const hot = p.colors.hot
    const t = textes(p.lang)
    // La bande est partagée avec d'autres plugins (ponytail) : un cadre au contour mauve, comme une suggestion
    // dans le panneau, sépare les suggestions de ce qu'ils affichent.
    // Sous l'affichage de ponytail : un trait gris qui le ferme, un espace, puis le cadre des suggestions.
    // Même trait que ponytail : une image sur le bureau (les caractères y font une ligne brisée), des « ─ » au terminal.
    const els = $.ui.resolve(e)
    const rule =
      e.surface === 'desktop' && 'Svg' in els ? (
        <els.Svg source={RULE_SVG} alt={t.ruleAlt} />
      ) : (
        <Text dimColor wrap="truncate-end">{'─'.repeat(e.props.bodyColumns)}</Text>
      )
    return (
      <Box flexDirection="column">
      {rule}
      <Box flexDirection="column" paddingTop={e.surface === 'desktop' ? undefined : 'sm'}>
      <Box flexDirection="column" borderStyle="round" borderColor={hot} paddingX="sm">
        <Text size="caption" weight="bold" color={hot}>{t.suggestions}</Text>
        {shown.map(([id, hint]) => (
          <Box key={'sug-' + id} flexDirection="row" gap="sm">
            <Text weight="semibold" color={inkOn(hot)} backgroundColor={hot}> {id} </Text>
            {disabled.has(id) && <Text color="warning">{t.disabled}</Text>}
            <Text dimColor>{hint}</Text>
          </Box>
        ))}
      </Box>
      </Box>
      </Box>
    )
  })
}
