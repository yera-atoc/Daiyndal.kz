import { logServerError } from '@/lib/serverLog'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { syncBtAddToCrm, syncBtDeleteToCrm, syncBtGroupToCrm, syncBtRenameToCrm } from '@/lib/crmSync'
import { GROUP_ID_RE, LETTERS, MONTH_RE, cleanName, type Exam, type Group, type SubjectConfig } from '@/lib/bilimTest'
import {
  addStudent,
  deleteGroup,
  deleteStudent,
  deleteSubmission,
  getExam,
  groupHistories,
  listExams,
  listGroups,
  listStudents,
  replaceSubmission,
  listSubmissions,
  newExam,
  previousScores,
  renameStudent,
  resetPin,
  saveExam,
  saveGroup,
} from '@/lib/bilimTestStore'
import { seasonView } from '@/lib/bilimSeasonServer'
import { seasonFor } from '@/lib/bilimSeason'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const denied = () => NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return denied()
  try {
    const groups = await listGroups()
    const gid = req.nextUrl.searchParams.get('group') || groups[0]?.id
    const group = groups.find((g) => g.id === gid) ?? null
    if (!group) return NextResponse.json({ groups, group: null, students: [], exams: [], exam: null, submissions: [], previous: null })
    const [students, exams] = await Promise.all([listStudents(group.id), listExams(group.id)])
    const eid = req.nextUrl.searchParams.get('exam')
    const exam = exams.find((e) => e.id === eid) ?? exams[exams.length - 1] ?? null
    return NextResponse.json({
      groups,
      group,
      students,
      exams: exams.map((e) => ({ id: e.id, title: e.title, month: e.month })),
      exam,
      submissions: exam ? await listSubmissions(exam.id) : [],
      previous: exam ? await previousScores(exam) : null,
      histories: exam ? await groupHistories(exam) : {},
      season: seasonFor(group.id, group.name) || exams.length ? await seasonView(group.id, 'admin') : null,
    })
  } catch (e: any) {
    await logServerError('bilim-test/admin', e)
    return bad(e.message, 500)
  }
}

const SUBJ_ID_RE = /^[a-z0-9_-]{1,24}$/

function cleanSubjects(list: any): SubjectConfig[] {
  const seen = new Set<string>()
  return (Array.isArray(list) ? list : [])
    .map((s: any) => ({
      id: String(s?.id ?? ''),
      name: String(s?.name ?? '').trim().slice(0, 40),
      short: String(s?.short || s?.name || '').trim().slice(0, 20),
      max: Math.min(10000, Math.max(1, Math.round(Number(s?.max) || 0))),
      questions: Math.min(150, Math.max(1, Math.round(Number(s?.questions) || 0))),
      options: Math.min(5, Math.max(2, Math.round(Number(s?.options) || 4))),
    }))
    .filter((s) => SUBJ_ID_RE.test(s.id) && s.name && !seen.has(s.id) && seen.add(s.id))
}

function cleanUrl(v: any) {
  const u = String(v ?? '').trim()
  return /^https:\/\/[^\s"'<>]{4,600}$/.test(u) ? u : ''
}

function cleanExam(e: any, existing: Exam): Exam {
  const subjects = cleanSubjects(e?.subjects)
  const answer_key: Exam['answer_key'] = {}
  const questions: Exam['questions'] = {}
  for (const s of subjects) {
    const allowed = LETTERS.slice(0, s.options)
    const k = e?.answer_key?.[s.id]
    if (Array.isArray(k)) answer_key[s.id] = Array.from({ length: s.questions }, (_, i) => (allowed.includes(k[i]) ? k[i] : ''))
    const q = e?.questions?.[s.id]
    if (Array.isArray(q)) {
      questions[s.id] = Array.from({ length: s.questions }, (_, i) => {
        const x = q[i] ?? {}
        const out: Record<string, string> = {}
        const text = String(x.text ?? '').slice(0, 4000)
        const topic = String(x.topic ?? '').trim().slice(0, 120)
        const image = cleanUrl(x.image)
        if (text.trim()) out.text = text
        if (topic) out.topic = topic
        if (image) out.image = image
        return out
      })
    }
  }
  return {
    ...existing, // id, топ, ай өзгермейді
    title: String(e?.title || existing.title).slice(0, 60),
    subjects,
    open_subjects: (Array.isArray(e?.open_subjects) ? e.open_subjects : []).filter((x: any) => subjects.some((s) => s.id === x)),
    answer_key,
    questions,
    published: !!e?.published,
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return denied()
  try {
    const b = await req.json().catch(() => null)
    const action = b?.action

    // ── Топтар
    if (action === 'create-group' || action === 'update-group') {
      const groups = await listGroups()
      const name = String(b.group?.name ?? '').trim().slice(0, 60)
      if (name.length < 2) return bad('Топтың атын жазыңыз')
      const subjects = cleanSubjects(b.group?.subjects)
      if (!subjects.length) return bad('Кемінде бір пән қосыңыз')
      let id = String(b.group?.id ?? '')
      if (action === 'create-group') {
        id = `g${Date.now().toString(36)}`
      } else if (!groups.some((g) => g.id === id)) return bad('Топ табылмады', 404)
      if (!GROUP_ID_RE.test(id)) return bad('Топ id дұрыс емес')
      const old = groups.find((g) => g.id === id)
      const group: Group = { id, name, subjects, position: old?.position ?? Math.max(0, ...groups.map((g) => g.position)) + 1 }
      await saveGroup(group)
      await syncBtGroupToCrm(id, name)
      return NextResponse.json({ ok: true, id })
    }
    if (action === 'delete-group') {
      const id = String(b.id)
      if (id === 'nzm') return bad('НЗМ тобын өшіруге болмайды')
      if ((await listStudents(id)).length || (await listExams(id, 'all')).length)
        return bad('Алдымен топтағы оқушылар мен сынақтарды өшіріңіз')
      await deleteGroup(id)
      return NextResponse.json({ ok: true })
    }

    // ── Сынақтар
    if (action === 'create') {
      const group = (await listGroups()).find((g) => g.id === String(b.group))
      const month = String(b.month)
      if (!group) return bad('Топ табылмады', 404)
      if (!MONTH_RE.test(month)) return bad('Ай дұрыс емес')
      const exam = newExam(group, month)
      if (await getExam(exam.id)) return bad('Бұл айдың сынағы бар', 409)
      await saveExam(exam)
      return NextResponse.json({ ok: true, id: exam.id })
    }
    if (action === 'save') {
      const existing = await getExam(String(b.exam?.id ?? ''))
      if (!existing) return bad('Сынақ табылмады', 404)
      const exam = cleanExam(b.exam, existing)
      if (!exam.subjects.length) return bad('Кемінде бір пән керек')
      await saveExam(exam)
      return NextResponse.json({ ok: true })
    }
    // Әкімші оқушының жауап парағын түзетеді немесе қағаздан қолмен енгізеді
    if (action === 'set-submission') {
      const exam = await getExam(String(b.exam ?? ''))
      const cfg = exam?.subjects.find((s) => s.id === String(b.subject ?? ''))
      if (!exam || !cfg) return bad('Сынақ табылмады', 404)
      const st = (await listStudents(exam.group_id)).find((s) => s.full_name === String(b.student ?? ''))
      if (!st) return bad('Оқушы табылмады', 404)
      const allowed = LETTERS.slice(0, cfg.options)
      const answers = Array.isArray(b.answers) ? b.answers.map((a: unknown) => (typeof a === 'string' && allowed.includes(a) ? a : '')) : null
      if (!answers || answers.length !== cfg.questions) return bad('Жауап парағы дұрыс емес')
      await replaceSubmission({ exam_id: exam.id, student_name: st.full_name, subject: cfg.id, answers })
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete-submission') {
      await deleteSubmission(String(b.id))
      return NextResponse.json({ ok: true })
    }

    // ── Оқушылар
    if (action === 'add-student' || action === 'rename-student') {
      const name = cleanName(b.name)
      if (name.length < 3) return bad('Аты-жөнін толық жазыңыз')
      const res = action === 'add-student' ? await addStudent(String(b.group), name) : await renameStudent(String(b.id), name)
      if (res === 'duplicate') return bad('Бұл аты-жөні топта бар', 409)
      if (res === 'missing') return bad('Оқушы табылмады', 404)
      if (action === 'add-student') await syncBtAddToCrm(String(b.group), name)
      else await syncBtRenameToCrm(String(b.id), name)
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete-student') {
      await deleteStudent(String(b.id))
      await syncBtDeleteToCrm(String(b.id))
      return NextResponse.json({ ok: true })
    }
    if (action === 'reset-pin') {
      await resetPin(String(b.id))
      return NextResponse.json({ ok: true })
    }

    // ── Сұрақ суретін жүктеу: браузер файлды тікелей Supabase Storage-ке салады
    if (action === 'upload-url') {
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
      const safe = String(b.fileName ?? 'image').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)
      const path = `bilim-test/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`
      const { data, error } = await supabaseAdmin.storage.from('materials').createSignedUploadUrl(path)
      if (error) return bad(error.message, 500)
      const { data: pub } = supabaseAdmin.storage.from('materials').getPublicUrl(path)
      return NextResponse.json({ path: data.path, token: data.token, publicUrl: pub.publicUrl })
    }

    return bad('Белгісіз әрекет')
  } catch (e: any) {
    await logServerError('bilim-test/admin', e)
    return bad(e.message, 500)
  }
}
