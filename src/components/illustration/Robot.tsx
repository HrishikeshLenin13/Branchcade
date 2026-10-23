/** Original SVG artwork. Coordinates are viewBox coordinates, never physics units. */
export function Robot({
  x = 0,
  y = 0,
  heading = 0,
  radius = 6,
}: {
  x?: number
  y?: number
  heading?: number
  radius?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${heading})`}>
      <circle r={radius} fill="#EDB651" fillOpacity=".12" stroke="#FAD58D" strokeWidth=".35" />
      <g transform={`scale(${radius / 8})`}>
        <rect x="-5.5" y="-8" width="11" height="3.5" rx="1" fill="#0C1319" />
        <rect x="-5.5" y="4.5" width="11" height="3.5" rx="1" fill="#0C1319" />
        <rect
          x="-6"
          y="-5.5"
          width="12"
          height="11"
          rx="2.5"
          fill="#EDB651"
          stroke="#FAD58D"
          strokeWidth=".35"
        />
        <path d="M-3 -3H2V3H-3Z" fill="#253D46" />
        <circle cx="-.5" cy="0" r="1.4" fill="#6CC4D3" />
        <rect x="4" y="-3" width="3" height="6" rx="1" fill="#6CC4D3" />
        <path d="M-5 -7H4M-5 6H4" stroke="#65717A" strokeWidth=".5" />
      </g>
    </g>
  )
}
