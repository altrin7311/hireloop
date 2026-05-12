export const APPLICATION_STATUSES = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export interface JobApplication {
  id: string
  company: string
  role: string
  appliedAt: string
  status: ApplicationStatus
  jobUrl?: string
  notes?: string
}

export function isApplicationStatus(v: unknown): v is ApplicationStatus {
  return typeof v === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(v)
}

export function parseStoredApplications(raw: unknown): JobApplication[] {
  if (!Array.isArray(raw)) return []
  const out: JobApplication[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (
      typeof o.id !== 'string' ||
      typeof o.company !== 'string' ||
      typeof o.role !== 'string' ||
      typeof o.appliedAt !== 'string' ||
      !isApplicationStatus(o.status)
    ) {
      continue
    }
    out.push({
      id: o.id,
      company: o.company,
      role: o.role,
      appliedAt: o.appliedAt,
      status: o.status,
      jobUrl: typeof o.jobUrl === 'string' ? o.jobUrl : undefined,
      notes: typeof o.notes === 'string' ? o.notes : undefined,
    })
  }
  return out
}
