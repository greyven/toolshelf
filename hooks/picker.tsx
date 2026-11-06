// Sélecteur en cases pour le terminal (pas d'image vectorielle) : carré saturation × luminosité à gauche,
// barre de teinte à droite. Envoie { target, hex } au panneau.
import type { ClientModule } from 'claude-code'

import { hexToHsv, hsvToHex, inkOn } from './colors'

type Props = { target: string; hex: string }
type State = { h: number; s: number; v: number; src: string; zone: 'sv' | 'hue' | null }

const W = 24
const H = 10
const HUE_X = W + 1

const clamp = (n: number) => Math.max(0, Math.min(1, n))

const Picker: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  // L'état local garde la teinte exacte ; il repart de la couleur reçue quand elle vient d'ailleurs (champ hexadécimal).
  const cur: State = surface.state && surface.state.src === props.hex ? surface.state : { ...hexToHsv(props.hex), src: props.hex, zone: null }

  surface.onPointer(e => {
    const st: State = surface.state && surface.state.src === props.hex ? surface.state : cur
    if (e.type === 'up') return surface.setState({ ...st, zone: null })
    if (e.button !== 'left' || (e.type !== 'down' && e.type !== 'move')) return
    const zone = e.type === 'down' ? (e.x >= HUE_X ? 'hue' : 'sv') : st.zone
    if (!zone) return
    const next = zone === 'hue' ? { ...st, h: clamp(e.y / (H - 1)) * 359 } : { ...st, s: clamp(e.x / (W - 1)), v: 1 - clamp(e.y / (H - 1)) }
    const hex = hsvToHex(next.h, next.s, next.v)
    surface.setState({ ...next, src: hex, zone })
    surface.post({ target: props.target, hex })
  })

  const markX = Math.round(cur.s * (W - 1))
  const markY = Math.round((1 - cur.v) * (H - 1))
  const hueY = Math.round((cur.h / 359) * (H - 1))

  return (
    <Box flexDirection="column">
      {Array.from({ length: H }, (_, y) => (
        <Box flexDirection="row">
          {Array.from({ length: W }, (_, x) => {
            const bg = hsvToHex(cur.h, x / (W - 1), 1 - y / (H - 1))
            return <Text backgroundColor={bg} color={inkOn(bg)}>{x === markX && y === markY ? '○' : ' '}</Text>
          })}
          <Text> </Text>
          <Text backgroundColor={hsvToHex((y / (H - 1)) * 359, 1, 1)} color="#ffffff">{y === hueY ? '◀▶' : '  '}</Text>
        </Box>
      ))}
    </Box>
  )
}

export default Picker
