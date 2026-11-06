// Conversions de couleur partagées par le panneau et le sélecteur.

export const isHex = (t: string) => /^#?[0-9a-f]{6}$/i.test(t.trim())
export const normHex = (t: string) => '#' + t.trim().replace('#', '').toLowerCase()

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

// h en degrés, s et v entre 0 et 1.
export const hsvToHex = (h: number, s: number, v: number) => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
  }
  return '#' + [f(5), f(3), f(1)].map(x => x.toString(16).padStart(2, '0')).join('')
}

export const hexToHsv = (hex: string) => {
  const [r, g, b] = channels(hex)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: max === 0 ? 0 : d / max, v: max }
}
