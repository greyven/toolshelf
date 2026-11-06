// Zone de clic posée sur le dégradé vectoriel (bureau) : position relative dans la zone, zone visée gardée pendant le glissé.
// Envoie { target, zone, fx, fy } au panneau.
import type { ClientModule } from 'claude-code'

type Props = { target: string; cols: number; rows: number }
type State = { zone: 'sv' | 'hue' | null; cx?: number; cy?: number }

// Géométrie du dégradé, en unités de l'image : carré 220 × 160, barre de teinte de 20 à droite.
const SVG_W = 264
const SV_W = 220
const HUE_LEFT = 236
const idle: State = { zone: null }

const Overlay: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  surface.onPointer(e => {
    const st = surface.state ?? idle
    // L'application de bureau n'envoie pas de « down » (vérifié à l'essai) : le premier déplacement bouton gauche
    // enfoncé vaut appui, et le relâchement applique la position finale avant de lâcher la zone.
    if (e.button !== 'left' || (e.type !== 'down' && e.type !== 'move' && e.type !== 'up')) return
    const cols = Math.max(1, surface.columns)
    const rows = Math.max(1, surface.rows)
    const zone = st.zone ?? (((e.x + 0.5) / cols) * SVG_W >= HUE_LEFT - 8 ? 'hue' : 'sv')
    // Hors de la zone pendant un glissé, on garde la case du bord (son centre), pas le bord lui-même.
    const lastSvCol = Math.floor(SV_W / (SVG_W / cols)) - 1
    const x = Math.max(0, Math.min(zone === 'sv' ? lastSvCol : cols - 1, e.x))
    const y = Math.max(0, Math.min(rows - 1, e.y))
    surface.setState({ zone: e.type === 'up' ? null : zone, cx: x, cy: y })
    surface.post({ target: props.target, zone, fx: (((x + 0.5) / cols) * SVG_W) / SV_W, fy: (y + 0.5) / rows })
  })
  // Une zone vide se réduit à une ligne (vérifié à l'essai : 36×1) : on la remplit de lignes transparentes à la taille du dégradé.
  // Pendant un glissé, l'application ne transmet rien au panneau avant le relâchement : la zone dessine donc
  // elle-même un repère sous la souris, sans attendre le panneau.
  const st = surface.state
  const cols = props.cols
  return (
    <Box flexDirection="column">
      {Array.from({ length: props.rows }, (_, y) =>
        st?.zone && st.cy === y && st.cx !== undefined ? (
          // Décalé par une boîte en cases : l'application dessine les espaces plus étroits qu'une case (vu à l'essai).
          <Box flexDirection="row">
            {/* Teinte : seule la hauteur suit la souris ; le repère reste juste à droite de la barre (dernière colonne).
                Dégradé : le cercle est plus large qu'une case (environ 20 px pour 7,7) et part de son bord gauche
                (vu à l'essai) ; dessiné une case plus tôt, son centre tombe sur celui de la case visée. */}
            <Box width={st.zone === 'hue' ? cols - 1 : Math.max(0, Math.min(cols - 1, st.cx) - 1)} />
            <Text color="#ffffff" bold>{st.zone === 'hue' ? '◀' : '○'}</Text>
          </Box>
        ) : (
          <Text>{' '.repeat(cols)}</Text>
        ),
      )}
    </Box>
  )
}

export default Overlay
