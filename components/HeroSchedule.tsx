const days = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']
const highlighted = new Set([2, 6]) // Ср, Жс

export default function HeroSchedule() {
  return (
    <svg
      viewBox="0 0 380 220"
      role="img"
      aria-label="Апталық кесте: тесттер сәрсенбі мен жексенбіде өтеді"
      className="w-full max-w-md"
    >
      <text
        x="0"
        y="24"
        className="fill-ink font-hand text-2xl"
        style={{ fontSize: '22px' }}
      >
        Апталық кесте
      </text>
      <path
        d="M0 34 C 60 30, 140 38, 210 33"
        stroke="#E7A94C"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 6"
      />

      {days.map((day, i) => {
        const x = 20 + i * 50
        const y = 100
        const isOn = highlighted.has(i)
        return (
          <g key={day}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-ink/70"
              style={{ fontSize: '13px', fontFamily: 'var(--font-inter)' }}
            >
              {day}
            </text>
            {isOn && (
              <>
                <ellipse
                  cx={x}
                  cy={y - 5}
                  rx="22"
                  ry="18"
                  fill="none"
                  stroke={i === 2 ? '#E7A94C' : '#D65F4C'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="3 5"
                  transform={`rotate(${i === 2 ? -6 : 5} ${x} ${y - 5})`}
                />
                <text
                  x={x}
                  y={y - 40}
                  textAnchor="middle"
                  className="font-hand"
                  fill={i === 2 ? '#E7A94C' : '#D65F4C'}
                  style={{ fontSize: '20px' }}
                  transform={`rotate(${i === 2 ? -4 : 4} ${x} ${y - 40})`}
                >
                  тест
                </text>
              </>
            )}
          </g>
        )
      })}

      <line
        x1="0"
        y1="140"
        x2="360"
        y2="140"
        stroke="#16241F"
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      <text
        x="0"
        y="170"
        className="fill-ink/60"
        style={{ fontSize: '13px', fontFamily: 'var(--font-inter)' }}
      >
        Сәрсенбі мен жексенбі сайын — жаңа тест, жеке нәтиже.
      </text>
    </svg>
  )
}
