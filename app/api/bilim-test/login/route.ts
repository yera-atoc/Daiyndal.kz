import { NextRequest, NextResponse } from 'next/server'
import { checkPin, listGroups, listStudents } from '@/lib/bilimTestStore'
import { setStudentSession } from '@/lib/bilimTestAuth'
import { clientIp, lockedMessage, throttleCheck, throttleFail } from '@/lib/security'
import { loginCandidates } from '@/lib/loginMatch'

// Кіру: логин (өз аты-жөні, әкімшіде көрсетілгендей) + мұғалім берген 4 таңбалы PIN.
// Тізім браузерге жіберілмейді — басқа оқушылар мен топтар көрінбейді.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const login = String(body?.login ?? '').trim().slice(0, 120)
    const pin = String(body?.pin ?? '').trim()
    if (!login) return NextResponse.json({ error: 'Аты-жөніңді жаз' }, { status: 400 })
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN — 4 сан' }, { status: 400 })
    const ipKey = [`ip:${clientIp(req.headers)}`]
    const wait = await throttleCheck(ipKey)
    if (wait) return NextResponse.json({ error: lockedMessage(wait) }, { status: 429 })

    const groups = await listGroups()
    const all = (await Promise.all(groups.map((g) => listStudents(g.id)))).flat()
    const cands = loginCandidates(login, all)
    let locked = false
    for (const s of cands) {
      const res = await checkPin(s.id, pin)
      if (res === 'ok') {
        await setStudentSession(s.id)
        return NextResponse.json({ ok: true })
      }
      if (res === 'locked') locked = true
    }
    await throttleFail(ipKey)
    if (locked) return NextResponse.json({ error: 'Тым көп қате. 10 минуттан кейін қайталаңыз немесе мұғалімнен жаңа PIN сұраңыз.' }, { status: 429 })
    // Аты табылмады ма, PIN қате ме — әдейі айырмаймыз (басқа біреудің атын тексеріп көрмеу үшін)
    return NextResponse.json({ error: 'Аты-жөні не PIN қате. Атыңды мұғалімнің тізіміндегідей толық жаз.' }, { status: 401 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
