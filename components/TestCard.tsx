import type { TestItem } from '@/lib/tests'
import type { Subject } from '@/lib/subjects'

const textByAccent = {
  mustard: 'text-mustard',
  coral: 'text-coral',
  sky: 'text-sky',
}

export default function TestCard({
  test,
  subject,
}: {
  test: TestItem
  subject: Subject
}) {
  return (
    <div className="flex flex-col justify-between border border-ink/10 bg-card p-5">
      <div>
        <div className="flex items-center justify-between text-xs uppercase tracking-normal">
          <span className={`font-semibold ${textByAccent[subject.accent]}`}>
            {subject.name}
          </span>
          <span className="text-ink/50">{test.grade}-сынып</span>
        </div>
        <p className="mt-3 font-serif text-lg font-bold leading-snug">
          {test.title}
        </p>
        <p className="mt-1 text-sm text-ink/60">
          {test.week} · {test.questionCount} сұрақ
        </p>
      </div>

      <div className="mt-5 border-t border-dashed border-ink/15 pt-4">
        {test.available ? (
          <button className="w-full border border-ink py-2 text-sm font-medium transition hover:bg-ink hover:text-paper">
            Тестті қарау
          </button>
        ) : (
          <span className="block text-center text-sm text-ink/40">
            Жақында қосылады
          </span>
        )}
      </div>
    </div>
  )
}
