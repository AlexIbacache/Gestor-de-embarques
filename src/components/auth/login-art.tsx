/**
 * Decorative container yard for the login panel: nine containers that drop into
 * place one after another next to a gantry crane, over slowly drifting waves.
 *
 * Pure SVG + CSS (`animate-container-drop`, `animate-wave-drift` in
 * `globals.css`), so it is a Server Component and ships no JavaScript. The
 * brand art uses fixed hues on purpose: it always sits on the navy panel and is
 * not meant to change with the theme. `prefers-reduced-motion` is honoured by
 * the global rule in `globals.css`.
 */
const CONTAINERS: { x: number; y: number; fill: string }[] = [
  { x: 20, y: 186, fill: "#1F4E79" },
  { x: 136, y: 186, fill: "#3B8FDB" },
  { x: 252, y: 186, fill: "#8FA3B5" },
  { x: 368, y: 186, fill: "#2A8C8C" },
  { x: 78, y: 138, fill: "#D6E0EA" },
  { x: 194, y: 138, fill: "#1F4E79" },
  { x: 310, y: 138, fill: "#3B8FDB" },
  { x: 136, y: 90, fill: "#2A8C8C" },
  { x: 252, y: 90, fill: "#8FA3B5" },
];

export function LoginArt() {
  return (
    <svg
      viewBox="0 0 520 290"
      role="img"
      aria-label="Contenedores apilados en un muelle junto a una grúa"
      className="block h-auto w-full max-w-xl overflow-hidden"
    >
      <defs>
        <pattern id="login-ribs" width="7" height="10" patternUnits="userSpaceOnUse">
          <rect width="2.5" height="10" fill="#000" fillOpacity=".2" />
        </pattern>
      </defs>

      <g
        className="animate-wave-drift"
        fill="none"
        stroke="#2F5670"
        strokeWidth="2"
      >
        <path d="M-80 266q20-10 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" />
        <path
          d="M-60 280q20-10 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0"
          strokeOpacity=".6"
        />
      </g>
      <rect x="0" y="232" width="520" height="12" fill="#173347" />

      {CONTAINERS.map((container, index) => (
        <g
          key={`${container.x}-${container.y}`}
          className="animate-container-drop"
          style={{ ["--i" as string]: index }}
        >
          <rect
            x={container.x}
            y={container.y}
            width="112"
            height="46"
            rx="2"
            fill={container.fill}
          />
          <rect
            x={container.x}
            y={container.y}
            width="112"
            height="46"
            rx="2"
            fill="url(#login-ribs)"
          />
          <rect
            x={container.x + 104}
            y={container.y}
            width="6"
            height="46"
            fill="#000"
            fillOpacity=".25"
          />
        </g>
      ))}

      <g fill="none" stroke="#7FBCF0" strokeWidth="3" strokeOpacity=".9">
        <path d="M506 232V28M506 60L450 28M250 28H512M506 120L460 28" />
        <path d="M290 28V60M290 60h-20" strokeWidth="2" />
      </g>
      <rect x="496" y="14" width="22" height="16" fill="#7FBCF0" />
    </svg>
  );
}
