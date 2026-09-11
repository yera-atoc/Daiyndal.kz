import type { Subject } from '@/lib/subjects'

const borderByAccent = {
  mustard: 'border-mustard',
  coral: 'border-coral',
  sky: 'border-sky',
}

const textByAccent = {
  mustard: 'text-mustard',
  coral: 'text-coral',
  sky: 'text-sky',
}

export default function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <div
      className={`border-l-4 bg-card px-5 py-4 ${borderByAccent[subject.accent]}`}
    >
      <p className={`font-serif text-lg font-bold ${textByAccent[subject.accent]}`}>
        {subject.name}
      </p>
      <p className="mt-1 text-sm text-ink/70">{subject.description}</p>
    </div>
  )
}
