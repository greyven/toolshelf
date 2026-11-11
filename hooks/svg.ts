// Image vectorielle du panneau (bureau seulement) : la case à cocher.

export type CheckState = 'on' | 'off' | 'locked'

// Les trois états de la case dans le même cadre, pour qu'elle garde toujours la même taille.
// Image deux fois plus haute, moitié haute transparente : elle se pose sur une boîte de hauteur 0 (voir pane.tsx).
export function checkSvg(state: CheckState) {
  const fill = state === 'on' ? '#4caf50' : state === 'locked' ? '#4a4a4a' : '#2c2c2c'
  const stroke = state === 'off' ? '#ffffff' : fill
  const tick = state === 'off' ? '' : '<path d="M6 30.5 L9.5 34 L16 26" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="40" viewBox="0 0 22 40">' +
    `<rect x="1" y="21" width="20" height="18" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>${tick}</svg>`
  )
}
