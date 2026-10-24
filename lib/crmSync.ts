// CRM (students, student_groups) мен Білім тексеру (bt_students, bt_groups) арасындағы синхрондау.
// Екі жақтың біріндегі өзгеріс екіншісіне де түседі. Синхрондау қатесі негізгі әрекетті тоқтатпайды:
// қате болса, тек логқа жазылады (мысалы, migration_crm_sync.sql әлі іске қосылмаған болса).
import { addStudent, deleteStudent, listStudents, renameStudent } from './bilimTestStore'
import { todayAlmatyISO } from './payments'

async function db() {
  const { supabaseAdmin } = await import('./supabaseAdmin')
  return supabaseAdmin
}

async function safely(what: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (e: any) {
    console.warn(`CRM sync (${what}):`, e?.message ?? e)
  }
}

// ── CRM → Білім тексеру ──────────────────────────────────

/** CRM-де оқушы сақталғаннан кейін: топ Білім тексеруге байланған болса, сол жақта да қосу/атын өзгерту/көшіру */
export function syncCrmStudentToBt(crmId: string) {
  return safely('crm→bt save', async () => {
    const sb = await db()
    const { data: s } = await sb.from('students').select('id, full_name, group_id, bt_student_id').eq('id', crmId).maybeSingle()
    if (!s?.group_id) return
    const { data: g } = await sb.from('student_groups').select('bt_group_id').eq('id', s.group_id).maybeSingle()
    const btGroup = g?.bt_group_id as string | null
    if (!btGroup) return

    let btId = s.bt_student_id as string | null
    if (btId) {
      const { data: bt } = await sb.from('bt_students').select('id, group_id, full_name').eq('id', btId).maybeSingle()
      if (!bt) btId = null
      else {
        if (bt.group_id !== btGroup) await sb.from('bt_students').update({ group_id: btGroup }).eq('id', btId)
        if (bt.full_name !== s.full_name) await renameStudent(btId, s.full_name)
        return
      }
    }
    // Байланыс жоқ: аттас оқушы болса — байланыстырамыз, болмаса — қосамыз
    let peer = (await listStudents(btGroup)).find((x) => x.full_name === s.full_name)
    if (!peer) {
      await addStudent(btGroup, s.full_name)
      peer = (await listStudents(btGroup)).find((x) => x.full_name === s.full_name)
    }
    if (peer) await sb.from('students').update({ bt_student_id: peer.id }).eq('id', crmId)
  })
}

/** CRM-нен оқушы өшкенде Білім тексерудегі жазбасы да (жауап парақтарымен) өшеді */
export function syncCrmDeleteToBt(btStudentId: string | null | undefined) {
  if (!btStudentId) return Promise.resolve()
  return safely('crm→bt delete', () => deleteStudent(btStudentId))
}

// ── Білім тексеру → CRM ──────────────────────────────────

/** Білім тексеруге оқушы қосылғанда — байланысқан CRM тобына да қосу */
export function syncBtAddToCrm(btGroupId: string, fullName: string) {
  return safely('bt→crm add', async () => {
    const sb = await db()
    const { data: g } = await sb.from('student_groups').select('id, monthly_fee').eq('bt_group_id', btGroupId).maybeSingle()
    if (!g) return
    const bt = (await listStudents(btGroupId)).find((x) => x.full_name === fullName)
    if (!bt) return
    const { data: existing } = await sb.from('students').select('id').eq('bt_student_id', bt.id).maybeSingle()
    if (existing) return
    const { data: same } = await sb.from('students').select('id').eq('group_id', g.id).eq('full_name', fullName).maybeSingle()
    if (same) {
      await sb.from('students').update({ bt_student_id: bt.id }).eq('id', same.id)
      return
    }
    await sb.from('students').insert({
      full_name: fullName,
      group_id: g.id,
      status: 'active',
      start_date: todayAlmatyISO(),
      payment_amount: g.monthly_fee ?? null,
      bt_student_id: bt.id,
    })
  })
}

/** Білім тексеруде аты өзгергенде — CRM-де де */
export function syncBtRenameToCrm(btStudentId: string, fullName: string) {
  return safely('bt→crm rename', async () => {
    const sb = await db()
    const { data: rows } = await sb.from('students').select('id').eq('bt_student_id', btStudentId)
    for (const r of rows ?? []) {
      await sb.from('students').update({ full_name: fullName }).eq('id', r.id)
      await sb.from('payments').update({ student_name: fullName }).eq('student_id', r.id)
    }
  })
}

/** Білім тексеруден оқушы өшкенде — CRM-нен де (төлем тарихы сақталады) */
export function syncBtDeleteToCrm(btStudentId: string) {
  return safely('bt→crm delete', async () => {
    const sb = await db()
    await sb.from('students').delete().eq('bt_student_id', btStudentId)
  })
}

/** Білім тексеруде жаңа топ ашылғанда — CRM-де аттас топ құрып, байланыстыру */
export function syncBtGroupToCrm(btGroupId: string, name: string) {
  return safely('bt→crm group', async () => {
    const sb = await db()
    const { data: linked } = await sb.from('student_groups').select('id').eq('bt_group_id', btGroupId).maybeSingle()
    if (linked) {
      await sb.from('student_groups').update({ name }).eq('id', linked.id)
      return
    }
    const { data: same } = await sb.from('student_groups').select('id').eq('name', name).maybeSingle()
    if (same) await sb.from('student_groups').update({ bt_group_id: btGroupId }).eq('id', same.id)
    else await sb.from('student_groups').insert({ name, bt_group_id: btGroupId })
  })
}
