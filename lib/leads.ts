// Сайттағы өтінімдер (жазылу формасы және тегін сынақ). Server-only.
import { supabaseAdmin } from './supabaseAdmin'
import { clientIp, throttleCheck, throttleFail } from './security'

export const LEAD_STATUSES = ['new', 'called', 'enrolled', 'declined'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '') || null

/** Спам шегі: бір IP-ден сағатына 8 өтінім. Бұғатталса — минут саны */
export async function leadLimit(headers: Headers): Promise<{ wait: number; ip: string }> {
  const ip = clientIp(headers)
  return { wait: await throttleCheck([`lead:${ip}`]), ip }
}

export async function saveLead(ip: string, row: { source: 'form' | 'trial'; child_name: string; phone: string; grade?: unknown; parent_name?: unknown; direction?: unknown; comment?: unknown; trial?: unknown }) {
  await throttleFail([`lead:${ip}`]) // санағыш ретінде
  const { data, error } = await supabaseAdmin
    .from('site_leads')
    .insert({
      source: row.source,
      child_name: row.child_name.trim().slice(0, 120),
      phone: row.phone,
      grade: clip(row.grade, 20),
      parent_name: clip(row.parent_name, 120),
      direction: clip(row.direction, 60),
      comment: clip(row.comment, 1000),
      trial: row.trial ?? null,
      ip,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}
