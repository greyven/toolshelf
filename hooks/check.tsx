// Zone de clic de la case d'activation : envoie { toggle } au panneau.
// Sur le bureau, la case est une image dessinée dessous (blank) ; au terminal, la zone la peint elle-même.
// Un Button imposait sa propre taille de texte (vu à l'essai) : une zone peinte s'affiche à sa vraie taille.
import type { ClientModule } from 'claude-code'

type Props = { target: string; checked?: boolean; locked?: boolean; blank?: boolean }

const Check: ClientModule<Props, null> = (props, surface) => {
  const { Box, Text } = surface.elements
  surface.onPointer(e => {
    if (e.type === 'down') surface.post({ toggle: props.target })
  })
  const bg = props.locked ? '#4a4a4a' : props.checked ? '#4caf50' : '#2c2c2c'
  return (
    <Box flexDirection="row">
      {props.blank ? <Text>{'   '}</Text> : <Text backgroundColor={bg} color="#ffffff" bold>{props.checked ? ' ✓ ' : '   '}</Text>}
    </Box>
  )
}

export default Check
