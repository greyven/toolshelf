// Carré de la couleur actuelle d'un réglage : un clic ouvre son sélecteur ({ open }).
import type { ClientModule } from 'claude-code'

type Props = { target: string; hex: string }

const Swatch: ClientModule<Props, null> = (props, surface) => {
  const { Box, Text } = surface.elements
  surface.onPointer(e => {
    if (e.type === 'down') surface.post({ open: props.target })
  })
  return (
    <Box flexDirection="column">
      <Text backgroundColor={props.hex}>{'      '}</Text>
      <Text backgroundColor={props.hex}>{'      '}</Text>
    </Box>
  )
}

export default Swatch
