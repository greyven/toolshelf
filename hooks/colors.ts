// Couleur du texte posé sur une étiquette de couleur.

// Rouge, vert, bleu entre 0 et 1 d'une couleur « #rrggbb ».
const channels = (hex: string): [number, number, number] => {
  const at = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  return [at(1), at(3), at(5)]
}

// Texte blanc ou foncé selon ce qui contraste le mieux avec le fond (luminance relative WCAG).
export const inkOn = (hex: string) => {
  const [r, g, b] = channels(hex).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.061 ? '#ffffff' : '#1b1b1b'
}
