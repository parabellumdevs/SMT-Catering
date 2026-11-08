/**
 * Gradient Mesh Backdrop.
 *
 * Banda horizontal atmosférica en el tercio superior compuesta por parches orgánicos
 * difuminados: pastel cream (#f5e9d4), lemon/sherbet (#9b6829), lavender (#b9b9f9),
 * electric indigo (#533afd) y ruby pink (#ea2261 / #f96bee).
 */
export function GradientMesh() {
  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden opacity-75 md:h-96"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMin slice"
      >
        <defs>
          <filter id="mesh-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="70" />
          </filter>
          <linearGradient id="mesh-fade" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <mask id="mesh-mask">
            <rect width="1440" height="380" fill="url(#mesh-fade)" />
          </mask>
        </defs>

        <g filter="url(#mesh-blur)" mask="url(#mesh-mask)">
          {/* Fondo cálido pastel cream */}
          <rect width="1440" height="380" fill="#f5e9d4" fillOpacity="0.35" />

          {/* Mancha lemon / sherbet cálido a la izquierda */}
          <ellipse cx="220" cy="110" rx="280" ry="180" fill="#9b6829" fillOpacity="0.18" />

          {/* Mancha lavender / indigo suave en el centro-izq */}
          <ellipse cx="560" cy="140" rx="340" ry="200" fill="#b9b9f9" fillOpacity="0.45" />

          {/* Núcleo electric indigo central */}
          <ellipse cx="880" cy="120" rx="360" ry="190" fill="#533afd" fillOpacity="0.22" />

          {/* Mancha ruby pink / magenta a la derecha */}
          <ellipse cx="1200" cy="130" rx="290" ry="170" fill="#ea2261" fillOpacity="0.20" />
          <ellipse cx="1380" cy="90" rx="200" ry="140" fill="#f96bee" fillOpacity="0.18" />
        </g>
      </svg>
    </div>
  )
}
