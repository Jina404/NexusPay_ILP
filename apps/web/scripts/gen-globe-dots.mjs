import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const land = JSON.parse(
  readFileSync(join(root, '../src/data/world-land-110m.json'), 'utf8')
)

const CX = 300
const CY = 300
const R = 228
const MERIDIAN = 18
const STEP = 3

const polygons = land.features.flatMap((feature) => {
  const { type, coordinates } = feature.geometry
  return type === 'Polygon' ? [coordinates] : coordinates
})

function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function isLand(lon, lat) {
  for (const polygon of polygons) {
    if (!pointInRing(lon, lat, polygon[0])) continue
    let inHole = false
    for (let i = 1; i < polygon.length; i++) {
      if (pointInRing(lon, lat, polygon[i])) {
        inHole = true
        break
      }
    }
    if (!inHole) return true
  }
  return false
}

const dots = []

for (let lat = -58; lat <= 78; lat += STEP) {
  for (let lon = -180; lon < 180; lon += STEP) {
    if (!isLand(lon, lat)) continue

    const latRad = (lat * Math.PI) / 180
    const lonRad = ((lon - MERIDIAN) * Math.PI) / 180
    const x = CX + R * Math.cos(latRad) * Math.sin(lonRad)
    const y = CY - R * Math.sin(latRad)
    const z = R * Math.cos(latRad) * Math.cos(lonRad)
    if (z < 6) continue

    dots.push({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      s: Math.round((0.95 + (z / R) * 1.35) * 100) / 100
    })
  }
}

writeFileSync(join(root, '../src/data/globe-land-dots.json'), JSON.stringify(dots))
console.log(`Wrote ${dots.length} globe dots`)
