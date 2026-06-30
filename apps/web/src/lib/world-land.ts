export type GlobeDot = { x: number; y: number; s: number }

export function projectGlobePoint(
  latDeg: number,
  lonDeg: number,
  cx: number,
  cy: number,
  radius: number,
  centralMeridian = 18
) {
  const lat = (latDeg * Math.PI) / 180
  const lon = ((lonDeg - centralMeridian) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(lat) * Math.sin(lon),
    y: cy - radius * Math.sin(lat),
    z: radius * Math.cos(lat) * Math.cos(lon)
  }
}

export function globeArcPath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  lift = 1.3
) {
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const dx = mx - cx
  const dy = my - cy
  return `M ${ax} ${ay} Q ${cx + dx * lift} ${cy + dy * lift} ${bx} ${by}`
}
