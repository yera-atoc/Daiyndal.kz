// Beles логотипіндегі штрих-код ырғағы. Ені мен түсі детерминистік – сервер мен браузерде бірдей.
const INK = '#0E1424', BLUE = '#2B6BF3', RED = '#E5383B'
const PATTERN: [number, string][] = [
  [3, INK], [1, INK], [2, INK], [1, BLUE], [4, BLUE], [1, INK], [2, RED], [1, RED], [3, INK], [1, BLUE],
  [2, INK], [1, RED], [5, BLUE], [1, INK], [2, INK], [1, RED], [3, RED], [1, INK], [2, BLUE], [1, INK],
]

export default function Stripes({ count = 40, height = 'h-full', light = false, className = '' }: { count?: number; height?: string; light?: boolean; className?: string }) {
  const bars = Array.from({ length: count }, (_, i) => PATTERN[i % PATTERN.length])
  // Өсу графигі: сол жақтан оңға қарай биіктейді (оқушының айдан айға өсуі), сәл «тірі» ауытқумен
  const h = (i: number) => {
    const t = i / Math.max(1, count - 1)
    const jitter = ((i * 37) % 7) - 3 // −3…+3, детерминистік
    return Math.min(100, Math.max(10, 14 + 86 * Math.pow(t, 1.25) + jitter))
  }
  return (
    <div className={`flex items-end gap-[3px] ${height} ${className}`} aria-hidden>
      {bars.map(([w, c], i) => (
        <span
          key={i}
          className="stripe rounded-[1px]"
          style={{ flex: `${w} 0 0`, height: `${h(i).toFixed(1)}%`, background: light && c === INK ? '#FFFFFF' : c, opacity: light && c === INK ? 0.9 : 1, animationDelay: `${i * 28}ms` }}
        />
      ))}
    </div>
  )
}
