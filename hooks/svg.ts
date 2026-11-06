// Images vectorielles du panneau (bureau seulement) : la case à cocher et le sélecteur de couleur.
import { hsvToHex } from './colors'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

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

// La souris n'est connue qu'à la case près (36 colonnes × 8 lignes, une colonne = 264/36 unités, une ligne = 20) :
// chaque case est peinte avec la couleur exacte que le clic à cet endroit sélectionne (même calcul que pickAt).
const CELL_W = 264 / 36
const SV_COLS = 30 // 30 colonnes × 7,33 = 220 unités, la largeur du carré
const PICK_ROWS = 8

function pickerCells(h: number) {
  const cells: string[] = []
  for (let r = 0; r < PICK_ROWS; r++) {
    const val = 1 - (r + 0.5) / PICK_ROWS
    for (let c = 0; c < SV_COLS; c++) {
      const sat = clamp01(((c + 0.5) * CELL_W) / 220)
      cells.push(`<rect x="${(c * CELL_W).toFixed(2)}" y="${r * 20}" width="${CELL_W.toFixed(2)}" height="20" fill="${hsvToHex(h, sat, val)}"/>`)
    }
    cells.push(`<rect x="236" y="${r * 20}" width="20" height="20" fill="${hsvToHex(((r + 0.5) / PICK_ROWS) * 359.9, 1, 1)}"/>`)
  }
  return cells.join('')
}

export function pickerSvg(h: number, s: number, v: number) {
  const cx = (s * 220).toFixed(1)
  const cy = ((1 - v) * 160).toFixed(1)
  const hy = ((h / 360) * 160).toFixed(1)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 -160 264 320" preserveAspectRatio="none" shape-rendering="crispEdges">
${pickerCells(h)}
<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="3" shape-rendering="auto"/>
<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="#fff" stroke-width="1.5" shape-rendering="auto"/>
<path d="M229 ${hy}m0 -5l6 5l-6 5z M263 ${hy}m0 -5l-6 5l6 5z" fill="#ddd" stroke="#333" stroke-width="0.5" shape-rendering="auto"/>
</svg>`
}
