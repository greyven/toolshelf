// Le dessin du panneau : en-tête, liste des cartes par section, et écran des réglages.
import { atom, read, update } from 'claude-code'

import type { AutoInfo, Found, Prefs, Tint } from '../types'

import { type ColorTarget, togglePicker, typeHex } from './colorpick'
import { inkOn, isHex } from './colors'
import { discover } from './discover'
import { infoOf, keywordsOf, literalKeyword, short } from './fiches'
import { writeFiche } from './autofiche'
import type { Dollar } from './files'
import { reloadShared, setPrefs } from './shared'
import { DEFAULTS } from './state'
import { checkSvg, pickerSvg } from './svg'
import { LANG_NAMES, LANGS, type Lang, type Textes, textes } from './textes'

const active = atom({ plugin: 'toolshelf', key: 'active' } as const, {})
const auto = atom({ plugin: 'toolshelf', key: 'auto' } as const, {})
const found = atom({ plugin: 'toolshelf', key: 'found' } as const, [])
const generating = atom({ plugin: 'toolshelf', key: 'generating' } as const, [])
const hot = atom({ plugin: 'toolshelf', key: 'hot' } as const, {})
const kwOpen = atom({ plugin: 'toolshelf', key: 'kwOpen' } as const, null)
const livrees = atom({ plugin: 'toolshelf', key: 'livrees' } as const, {})
const open = atom({ plugin: 'toolshelf', key: 'open' } as const, null)
const picking = atom({ plugin: 'toolshelf', key: 'picking' } as const, null)
const pickHsv = atom({ plugin: 'toolshelf', key: 'pickHsv' } as const, null)
const prefs = atom({ plugin: 'toolshelf', key: 'prefs' } as const, DEFAULTS)
const settings = atom({ plugin: 'toolshelf', key: 'settings' } as const, false)
const used = atom({ plugin: 'toolshelf', key: 'used' } as const, {})

type RenderEvent = Parameters<Dollar['ui']['resolve']>[0] & { props: { scroll: { bodyRows: number } } }
// Les surfaces qui ont des zones cliquables et un champ de saisie (terminal et bureau) : le panneau en a besoin.
type Els = Extract<ReturnType<Dollar['ui']['resolve']>, { Client: unknown; Input: unknown }>

const TINTS: Tint[] = ['passif', 'actif', 'mixte', 'hot']

// Ce que chaque morceau du dessin lit : éléments de la surface, réglages et état de la discussion.
type View = {
  els: Els
  t: Textes
  Svg: any
  p: Prefs
  all: Found[]
  list: Found[]
  minRows: number
}

function chip($: Dollar, v: View, t: Tint, text: string) {
  const { Text } = v.els
  const bg = v.p.colors[t]
  return <Text size="caption" weight="semibold" color={inkOn(bg)} backgroundColor={bg}> {text} </Text>
}

function heading($: Dollar, v: View, t: string) {
  const { Text } = v.els
  return <Text size="caption" weight="bold" color="subtle">{t.toUpperCase()}</Text>
}

function header($: Dollar, v: View, isSettings: boolean) {
  const { Box, Text, Button } = v.els
  return (
    <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap="sm" flexWrap="wrap">
      <Text dimColor>
        {isSettings ? v.t.settingsIntro : v.t.toolsIntro(v.list.length, v.all.length)}
      </Text>
      <Box flexDirection="row" gap="md">
        {!isSettings && (
          <Button key="refresh" plain onPress={async () => { await reloadShared($); await discover($); $.ui.toast(v.t.refreshed) }}>
            <Text weight="semibold">{v.t.refresh}</Text>
          </Button>
        )}
        <Button key="gear" plain onPress={() => update($, settings, s => !s)}>
          <Text weight="semibold">{isSettings ? v.t.close : v.t.settings}</Text>
        </Button>
      </Box>
    </Box>
  )
}

// ---------- Réglages ----------

// La langue du panneau et des fiches : le recensement relit le répertoire de fiches de cette langue.
async function setLang($: Dollar, lang: Lang) {
  await setPrefs($, q => ({ ...q, lang }))
  await reloadShared($)
  await discover($)
}

function languageSettings($: Dollar, v: View) {
  const { Box, Text, Button } = v.els
  return (
    <Box flexDirection="column" gap="xs">
      {heading($, v, v.t.language)}
      <Box flexDirection="row" gap="md" flexWrap="wrap">
        {(Object.keys(LANGS) as Lang[]).map(l => (
          <Button key={'lang-' + l} plain onPress={() => setLang($, l)}>
            <Text weight={v.p.lang === l ? 'bold' : undefined}>{v.p.lang === l ? '◉' : '○'} {LANG_NAMES[l]}</Text>
          </Button>
        ))}
      </Box>
    </Box>
  )
}

// Ligne à cocher des réglages : affiche ou cache une carte, ou la légende (n'active ni ne désactive aucun outil).
function settingCheck($: Dollar, v: View, key: string, isOn: boolean, text: string, onPress: () => unknown) {
  const { Button, Text } = v.els
  return (
    <Button key={key} plain onPress={onPress}>
      <Text>{isOn ? '☑' : '☐'} {text}</Text>
    </Button>
  )
}

// Le sélecteur ouvert : dégradé (bureau) ou grille de cases (terminal), aperçu, champ hexadécimal, OK.
function picker($: Dollar, v: View, target: ColorTarget, hex: string, hsv: { h: number; s: number; v: number }) {
  const { Box, Text, Button, Input, Client } = v.els
  const { Svg } = v
  return (
    <Box flexDirection="row" gap="md" flexWrap="wrap" paddingY="xs">
      {Svg ? (
        // L'application ne donne la souris qu'à une zone dessinée après le dégradé et ignore les marges négatives ;
        // une image qui dépasse sa boîte déborde à parts égales en haut et en bas. L'image du dégradé, deux fois plus
        // haute avec une moitié haute transparente, est centrée sur une boîte de hauteur zéro : sa moitié visible
        // recouvre exactement la zone de clic qui suit.
        // Tailles mesurées sur capture : 36 cases = 266 px, une ligne ≈ 19,7 px ; le dégradé visible fait 8 lignes (158 px).
        <Box flexDirection="column" width={36}>
          <Box width={36} height={0}>
            <Svg source={pickerSvg(hsv.h, hsv.s, hsv.v)} alt={v.t.pickerAlt} width={266} height={316} />
          </Box>
          <Client key={'ov-' + target} module="./overlay.tsx" props={{ target, cols: 36, rows: 8 }} width={36} height={8} />
        </Box>
      ) : (
        <Client key={'pk-' + target} module="./picker.tsx" props={{ target, hex }} width={27} height={10} />
      )}
      <Box flexDirection="column" gap="sm">
        <Text size="caption" dimColor>{v.t.chosenColor}</Text>
        <Box width={12} height={3} backgroundColor={hex} borderStyle="round" borderColor="subtle" />
        <Input
          key={'hex-' + target}
          label="#"
          value={hex.slice(1)}
          placeholder="5d79c0"
          onInput={(t: string) => (isHex(t) ? typeHex($, target, t) : undefined)}
          onSubmit={(t: string) => (isHex(t) ? typeHex($, target, t) : undefined)}
        />
        <Button key={'ok-' + target} onPress={() => update($, picking, () => null)}>
          OK
        </Button>
      </Box>
    </Box>
  )
}

// Une ligne de réglage : nom, carré de la couleur actuelle (clic = sélecteur), puis le sélecteur s'il est ouvert.
function colorRow($: Dollar, v: View, pickTarget: ColorTarget | null, hsv: { h: number; s: number; v: number }, target: ColorTarget, name: JSX.Element, hex: string, extra?: JSX.Element) {
  const { Box, Text, Client } = v.els
  return (
    <Box key={'row-' + target} flexDirection="column" gap="xs">
      <Box flexDirection="row" gap="sm" alignItems="center">
        <Box width={16}>{name}</Box>
        <Box borderStyle="round" borderColor={pickTarget === target ? 'text' : 'subtle'}>
          <Client key={'sw-' + target} module="./swatch.tsx" props={{ target, hex }} width={6} height={2} />
        </Box>
        <Text mono size="caption" dimColor>{hex}</Text>
        {extra}
      </Box>
      {pickTarget === target && picker($, v, target, hex, hsv)}
    </Box>
  )
}

function backgroundSettings($: Dollar, v: View, pickTarget: ColorTarget | null, hsv: { h: number; s: number; v: number }) {
  const { Box, Text, Button } = v.els
  const { p } = v
  return (
    <Box flexDirection="column" gap="xs">
      {heading($, v, v.t.background)}
      <Text size="caption" dimColor>{v.t.clickSwatch}</Text>
      {colorRow(
        $,
        v,
        pickTarget,
        hsv,
        'bg',
        <Text weight="semibold">{v.t.backgroundColor}</Text>,
        p.bg ?? '#1b1b1b',
        p.bg ? (
          <Button key="bg-reset" plain onPress={() => setPrefs($, q => ({ ...q, bg: null }))}>
            <Text dimColor>{v.t.themeReset}</Text>
          </Button>
        ) : (
          <Text size="caption" dimColor>{v.t.theme}</Text>
        ),
      )}
    </Box>
  )
}

function tintSettings($: Dollar, v: View, pickTarget: ColorTarget | null, hsv: { h: number; s: number; v: number }) {
  const { Box, Text, Button } = v.els
  const { p } = v
  return (
    <Box flexDirection="column" gap="xs">
      {heading($, v, v.t.tagColors)}
      {TINTS.map(t => colorRow($, v, pickTarget, hsv, t, chip($, v, t, v.t.tints[t][0]), p.colors[t]))}
      <Button key="reset-colors" plain onPress={() => setPrefs($, q => ({ ...q, colors: DEFAULTS.colors }))}>
        <Text dimColor>{v.t.resetColors}</Text>
      </Button>
    </Box>
  )
}

function displaySettings($: Dollar, v: View) {
  const { Box } = v.els
  return (
    <Box flexDirection="column" gap="xs">
      {heading($, v, v.t.display)}
      {settingCheck($, v, 'legend', v.p.legend, v.t.showLegend, () => setPrefs($, q => ({ ...q, legend: !q.legend })))}
    </Box>
  )
}

// Les mots-clés d'un outil, modifiés dans la langue en cours ; une liste vide est gardée (plus aucune suggestion par mot-clé).
function setKeywords($: Dollar, id: string, words: string[] | undefined) {
  return setPrefs($, q => {
    const mine = { ...q.keywords?.[q.lang] }
    if (words) mine[id] = words
    else delete mine[id]
    return { ...q, keywords: { ...q.keywords, [q.lang]: mine } }
  })
}

function keywordEditor($: Dollar, v: View, id: string, words: string[], edited: boolean) {
  const { Box, Text, Button, Input } = v.els
  return (
    <Box flexDirection="column" gap="xs" paddingX="sm">
      <Box flexDirection="row" gap="sm" flexWrap="wrap">
        {words.length === 0 && <Text size="caption" dimColor>{v.t.noKeyword}</Text>}
        {words.map((w, i) => (
          <Button key={`kw-del-${id}-${i}`} plain onPress={() => setKeywords($, id, words.filter((_, j) => j !== i))}>
            <Text mono size="caption" color="inverseText" backgroundColor="inactive"> {w} ✕ </Text>
          </Button>
        ))}
      </Box>
      <Input
        key={'kw-add-' + id}
        label="+"
        value=""
        placeholder={v.t.addKeyword}
        onSubmit={(text: string) => {
          const w = literalKeyword(text)
          return w && !words.includes(w) ? setKeywords($, id, [...words, w]) : undefined
        }}
      />
      {edited && (
        <Button key={'kw-reset-' + id} plain onPress={() => setKeywords($, id, undefined)}>
          <Text dimColor>{v.t.resetKeywords}</Text>
        </Button>
      )}
    </Box>
  )
}

// Un outil par ligne ; un clic déplie ses mots-clés. Seuls les outils qui ont une fiche en ont.
function keywordSettings($: Dollar, v: View, cards: Record<string, AutoInfo>, openId: string | null) {
  const { Box, Text, Button } = v.els
  const mine = v.p.keywords?.[v.p.lang] ?? {}
  return (
    <Box flexDirection="column" gap="xs">
      {heading($, v, v.t.keywords)}
      <Text size="caption" dimColor>{v.t.keywordsHelp}</Text>
      {v.all.filter(f => cards[f.id]).map(f => {
        const words = mine[f.id] ?? keywordsOf(cards[f.id]!.trigger)
        return (
          <Box key={'kwrow-' + f.id} flexDirection="column" gap="xs">
            <Button key={'kw-' + f.id} plain onPress={() => update($, kwOpen, o => (o === f.id ? null : f.id))}>
              <Text>{openId === f.id ? '▾ ' : '▸ '}{f.id}</Text>
              <Text dimColor> · {words.length}</Text>
            </Button>
            {openId === f.id && keywordEditor($, v, f.id, words, f.id in mine)}
          </Box>
        )
      })}
    </Box>
  )
}

function shownToolsSettings($: Dollar, v: View) {
  const { Box, Text, Button } = v.els
  const { p, all, list } = v
  const toggleShown = (id: string) => setPrefs($, q => ({ ...q, hidden: q.hidden.includes(id) ? q.hidden.filter(h => h !== id) : [...q.hidden, id] }))
  return (
    <Box flexDirection="column" gap="xs">
      {heading($, v, v.t.shownTools(list.length, all.length))}
      <Box flexDirection="row" gap="md" flexWrap="wrap">
        <Button key="all-on" plain onPress={() => setPrefs($, q => ({ ...q, hidden: [] }))}>
          <Text weight="semibold">{v.t.checkAll}</Text>
        </Button>
        <Button key="all-off" plain onPress={() => setPrefs($, q => ({ ...q, hidden: all.map(f => f.id) }))}>
          <Text weight="semibold">{v.t.uncheckAll}</Text>
        </Button>
      </Box>
      {all.map(f => settingCheck($, v, 'show-' + f.id, !p.hidden.includes(f.id), `${f.id}  (${v.t.kinds[f.kind]})`, () => toggleShown(f.id)))}
    </Box>
  )
}

async function settingsScreen($: Dollar, v: View) {
  const { Box } = v.els
  const pickTarget = await read($, picking)
  const hsv = (await read($, pickHsv)) ?? { h: 0, s: 0, v: 0 }
  const cards = { ...((await read($, auto)) ?? {}), ...((await read($, livrees)) ?? {}) }
  return (
    <Box flexDirection="column" gap="md" paddingX="xs" backgroundColor={v.p.bg ?? undefined} minHeight={v.minRows}>
      {header($, v, true)}
      {languageSettings($, v)}
      {backgroundSettings($, v, pickTarget, hsv)}
      {tintSettings($, v, pickTarget, hsv)}
      {displaySettings($, v)}
      {keywordSettings($, v, cards, await read($, kwOpen))}
      {shownToolsSettings($, v)}
    </Box>
  )
}

// ---------- Cartes ----------

// Ce qu'une carte lit de la discussion.
type CardState = {
  openId: string | null
  hotMap: Record<string, string>
  usedMap: Record<string, string>
  activeMap: Record<string, string>
  autoMap: Record<string, AutoInfo>
  // Toutes les fiches connues : celles du répertoire passent avant les rédigées.
  cards: Record<string, AutoInfo>
  deck: Record<string, AutoInfo>
  busy: string[]
}

// Case d'activation : image (bureau) avec une zone de clic transparente dessous, ou zone peinte (terminal).
function activationBox($: Dollar, v: View, f: Found) {
  const { Box, Client } = v.els
  const { Svg } = v
  if (f.kind === 'outil' || (f.kind === 'connecteur' && !f.key)) return null
  if (!Svg) return <Client key={'chk-' + f.id} module="./check.tsx" props={{ target: f.id, checked: f.key ? f.enabled : true, locked: !f.key }} width={3} height={1} />
  // Même montage que le sélecteur : image deux fois plus haute, moitié haute transparente, dans une boîte de hauteur 0.
  return (
    <Box flexDirection="column" width={3}>
      <Box width={3} height={0}>
        <Svg source={checkSvg(!f.key ? 'locked' : f.enabled ? 'on' : 'off')} alt={f.enabled ? v.t.checkedAlt : v.t.uncheckedAlt} width={22} height={40} />
      </Box>
      <Client key={'chk-' + f.id} module="./check.tsx" props={{ target: f.id, checked: f.enabled, locked: !f.key, blank: true }} width={3} height={1} />
    </Box>
  )
}

function cardTitleRow($: Dollar, v: View, f: Found, s: CardState, isHot: boolean, ink: string | undefined) {
  const { Box, Text, Button } = v.els
  const HOT_INK = inkOn(v.p.colors.hot)
  const mode = infoOf(f.id, s.cards)?.mode
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="sm">
      <Box flexDirection="row" alignItems="center" gap="sm" flexWrap="wrap" flexShrink={1}>
        <Button key={f.id} plain onPress={() => update($, open, o => (o === f.id ? null : f.id))}>
          <Text color={isHot ? HOT_INK : 'subtle'}>{s.openId === f.id ? '▾ ' : '▸ '}</Text>
          <Text size="body" weight="bold" color={ink} dimColor={!f.enabled && !isHot}>{f.id}</Text>
        </Button>
        <Text mono size="caption" color={isHot ? HOT_INK : 'subtle'}>{v.t.kinds[f.kind]}</Text>
        {mode ? chip($, v, mode, v.t.tints[mode][0]) : <Text size="caption" color="inverseText" backgroundColor="inactive">{v.t.unclassified}</Text>}
        {!f.enabled && <Text size="caption" color={isHot ? HOT_INK : 'warning'}>{v.t.disabled}</Text>}
        {s.usedMap[f.id] ? <Text size="caption" color={isHot ? HOT_INK : 'success'}>{v.t.used}</Text> : null}
      </Box>
      <Box paddingRight="xs">{activationBox($, v, f)}</Box>
    </Box>
  )
}

function cardDetails($: Dollar, v: View, f: Found, s: CardState, isHot: boolean, ink: string | undefined) {
  const { Box, Text, Button } = v.els
  const HOT_INK = inkOn(v.p.colors.hot)
  const info = infoOf(f.id, s.cards)
  const isWriting = s.busy.includes(f.id)
  const label = (t: string) => <Text size="caption" weight="semibold" color={isHot ? HOT_INK : 'subtle'}>{t.toUpperCase()}</Text>
  return (
    <Box flexDirection="column" gap="xs" paddingTop="sm" paddingBottom="xs">
      {info ? (
        <Box flexDirection="column" gap="xs">
          {label(v.t.howTo)}
          <Text color={ink}>{info.how}</Text>
          {label(v.t.why)}
          <Text color={ink}>{info.why}</Text>
          {label(v.t.when)}
          <Text color={ink}>{info.when}</Text>
          {label(v.t.examples)}
          <Box flexDirection="column" paddingX="sm" borderStyle="round" borderColor="subtle">
            {info.ex.map(x => <Text mono size="footnote" color={ink}>{x}</Text>)}
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" gap="xs">
          <Text color={ink}>{f.desc}</Text>
          <Text dimColor>{isWriting ? v.t.writing : v.t.noCard}</Text>
        </Box>
      )}
      {!s.deck[f.id] && !isWriting && (
        <Button key={'regen-' + f.id} plain onPress={() => writeFiche($, f)}>
          <Text dimColor>{s.autoMap[f.id] ? v.t.regenerate : v.t.writeCard}</Text>
        </Button>
      )}
      {label(v.t.commands)}
      <Box flexDirection="column">
        {f.commands.slice(0, 12).map(c => <Text mono size="footnote" color={ink} dimColor={!isHot}>{c}</Text>)}
        {f.commands.length > 12 && <Text dimColor>{v.t.andMore(f.commands.length - 12)}</Text>}
      </Box>
    </Box>
  )
}

// Une carte par outil : fond mauve = en cours d'utilisation ; contour mauve seul = suggestion d'après la demande.
function card($: Dollar, v: View, f: Found, s: CardState) {
  const { Box, Text } = v.els
  const HOT = v.p.colors.hot
  const HOT_INK = inkOn(HOT)
  const isHot = !!s.activeMap[f.id]
  const isSuggested = !isHot && !!s.hotMap[f.id]
  const ink = isHot ? HOT_INK : undefined
  const info = infoOf(f.id, s.cards)
  return (
    <Box
      key={f.id}
      flexDirection="column"
      borderStyle="round"
      borderColor={isHot || isSuggested ? HOT : 'subtle'}
      backgroundColor={isHot ? HOT : undefined}
      hover={{ borderColor: 'text' }}
      paddingX="sm"
    >
      {cardTitleRow($, v, f, s, isHot, ink)}
      <Text color={ink} dimColor={!isHot}>{info?.what ?? (f.kind === 'plugin' ? v.t.pluginSummary(f.commands.length) : short(f.desc))}</Text>
      {isHot ? (
        <Text color={HOT_INK} weight="semibold">{v.t.inUse}{s.activeMap[f.id]}</Text>
      ) : (
        isSuggested && <Text color={HOT} weight="semibold">→ {s.hotMap[f.id]}</Text>
      )}
      {s.openId === f.id && cardDetails($, v, f, s, isHot, ink)}
    </Box>
  )
}

// Section pliable ; l'état plié est gardé dans les réglages communs.
function section($: Dollar, v: View, s: CardState, kind: Found['kind'], items: Found[]) {
  const { Box, Text, Button } = v.els
  const title = v.t.sections[kind]
  const isFolded = (v.p.folded ?? []).includes(kind)
  const toggleFold = () => setPrefs($, q => ({ ...q, folded: isFolded ? (q.folded ?? []).filter(k => k !== kind) : [...(q.folded ?? []), kind] }))
  return (
    <Box flexDirection="column" gap="sm">
      <Button key={'sec-' + kind} plain onPress={toggleFold}>
        <Text size="caption" color="subtle">{isFolded ? '▸ ' : '▾ '}</Text>
        <Text size="caption" weight="bold" color="subtle">{title.toUpperCase()} · {items.length}</Text>
      </Button>
      {!isFolded && items.map(f => card($, v, f, s))}
    </Box>
  )
}

function legend($: Dollar, v: View) {
  const { Box, Text } = v.els
  return (
    <Box flexDirection="row" gap="sm" flexWrap="wrap" alignItems="center">
      {TINTS.map((t, i) => (
        <Box key={'lg-' + t} flexDirection="row" gap="sm" alignItems="center">
          {i > 0 && <Text size="caption" color="subtle">│</Text>}
          {chip($, v, t, v.t.tints[t][0])}
          <Text size="caption" dimColor>{v.t.tints[t][1]}</Text>
        </Box>
      ))}
    </Box>
  )
}

const SECTIONS: Found['kind'][] = ['plugin', 'skill', 'connecteur', 'outil']

async function cardState($: Dollar): Promise<CardState> {
  const autoMap = (await read($, auto)) ?? {}
  const deck = (await read($, livrees)) ?? {}
  return {
    openId: await read($, open),
    hotMap: (await read($, hot)) ?? {},
    usedMap: (await read($, used)) ?? {},
    activeMap: (await read($, active)) ?? {},
    autoMap,
    cards: { ...autoMap, ...deck },
    deck,
    busy: (await read($, generating)) ?? [],
  }
}

async function toolsScreen($: Dollar, v: View) {
  const { Box, Text } = v.els
  const s = await cardState($)
  return (
    <Box flexDirection="column" gap="md" paddingX="xs" backgroundColor={v.p.bg ?? undefined} minHeight={v.minRows}>
      {header($, v, false)}
      {v.p.legend && legend($, v)}
      {SECTIONS.map(kind => {
        const items = v.list.filter(f => f.kind === kind)
        return items.length > 0 && section($, v, s, kind, items)
      })}
      {v.list.length === 0 && <Text dimColor>{v.t.noneShown}</Text>}
    </Box>
  )
}

export async function renderPane($: Dollar, e: RenderEvent) {
  const els = $.ui.resolve(e) as Els
  const all = (await read($, found)) ?? []
  const p = (await read($, prefs)) ?? DEFAULTS
  const v: View = {
    els,
    t: textes(p.lang),
    // Le dégradé vectoriel n'existe que sur le bureau ; le terminal garde la grille de cases.
    Svg: e.surface === 'desktop' && 'Svg' in els ? (els as { Svg: unknown }).Svg : undefined,
    p,
    all,
    list: all.filter(f => !p.hidden.includes(f.id)),
    minRows: e.props.scroll.bodyRows,
  }
  return (await read($, settings)) ? settingsScreen($, v) : toolsScreen($, v)
}
