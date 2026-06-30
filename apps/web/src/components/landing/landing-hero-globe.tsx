import continentDots from '@/data/globe-land-dots.json'
import { globeArcPath, projectGlobePoint, type GlobeDot } from '@/lib/world-land'

const CX = 300
const CY = 300
const R = 228
const MERIDIAN = 18

const dots = continentDots as GlobeDot[]

const hubs = [
  { id: 'nairobi', lat: -1.29, lon: 36.82 },
  { id: 'lagos', lat: 6.52, lon: 3.38 },
  { id: 'london', lat: 51.51, lon: -0.13 },
  { id: 'dubai', lat: 25.2, lon: 55.27 },
  { id: 'singapore', lat: 1.35, lon: 103.82 },
  { id: 'newyork', lat: 40.71, lon: -74.01 },
  { id: 'saopaulo', lat: -23.55, lon: -46.63 }
].map((h) => ({ ...h, ...projectGlobePoint(h.lat, h.lon, CX, CY, R, MERIDIAN) }))

const routes: [string, string][] = [
  ['nairobi', 'london'],
  ['nairobi', 'dubai'],
  ['nairobi', 'singapore'],
  ['lagos', 'london'],
  ['london', 'newyork'],
  ['dubai', 'singapore'],
  ['newyork', 'saopaulo'],
  ['london', 'dubai']
]

const hubMap = Object.fromEntries(hubs.map((h) => [h.id, h]))

export function LandingHeroGlobe() {
  return (
    <div
      className="pointer-events-none absolute z-0 overflow-hidden
        inset-x-0 top-0 h-[min(85vw,340px)]
        sm:inset-y-0 sm:top-auto sm:h-auto sm:right-0 sm:left-[15%]
        lg:left-[38%]
        flex items-start sm:items-center justify-center sm:justify-end"
      aria-hidden
    >
      <div className="relative h-full w-full max-h-[340px] max-w-[340px] sm:max-h-none sm:max-w-none sm:h-[min(100vw,680px)] sm:w-[min(100vw,680px)] lg:h-[min(90vw,720px)] lg:w-[min(90vw,720px)] translate-x-[8%] sm:translate-x-[10%] lg:translate-x-[14%] opacity-50 sm:opacity-75 lg:opacity-100">
        <svg
          viewBox="0 0 600 600"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="sphereBase" cx="32%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#0d5c3a" />
              <stop offset="45%" stopColor="#064a2e" />
              <stop offset="100%" stopColor="#031a10" />
            </radialGradient>
            <radialGradient id="sphereHighlight" cx="28%" cy="22%" r="45%">
              <stop offset="0%" stopColor="rgba(0,184,107,0.35)" />
              <stop offset="100%" stopColor="rgba(0,184,107,0)" />
            </radialGradient>
            <clipPath id="sphereClip">
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>

          <circle cx={CX} cy={CY} r={R + 28} fill="rgba(0,184,107,0.12)" />
          <circle cx={CX} cy={CY} r={R + 8} fill="rgba(0,184,107,0.08)" />
          <circle cx={CX} cy={CY} r={R} fill="url(#sphereBase)" />
          <circle cx={CX} cy={CY} r={R} fill="url(#sphereHighlight)" />

          <g clipPath="url(#sphereClip)">
            {dots.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={dot.s}
                fill="rgba(77, 217, 152, 0.72)"
              />
            ))}
          </g>

          <g clipPath="url(#sphereClip)">
            {routes.map(([from, to], i) => {
              const a = hubMap[from]
              const b = hubMap[to]
              if (!a || !b || a.z < 0 || b.z < 0) return null
              return (
                <path
                  key={`${from}-${to}`}
                  d={globeArcPath(a.x, a.y, b.x, b.y, CX, CY)}
                  stroke="rgba(0, 184, 107, 0.45)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  fill="none"
                  className="hero-route"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              )
            })}
          </g>

          {hubs.map((hub) =>
            hub.z > 0 ? (
              <g key={hub.id}>
                <circle cx={hub.x} cy={hub.y} r="7" fill="rgba(255,255,255,0.12)" />
                <circle cx={hub.x} cy={hub.y} r="3.5" fill="white" />
                <circle cx={hub.x} cy={hub.y} r="1.5" fill="#00b86b" />
              </g>
            ) : null
          )}

          <circle cx={CX} cy={CY} r={R} stroke="rgba(0,184,107,0.2)" strokeWidth="1" fill="none" />
          <ellipse
            cx={CX - 42}
            cy={CY - 58}
            rx={88}
            ry={36}
            fill="rgba(255,255,255,0.04)"
            transform={`rotate(-18 ${CX - 42} ${CY - 58})`}
          />
        </svg>
      </div>
    </div>
  )
}
