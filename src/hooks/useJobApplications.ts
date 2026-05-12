import { useCallback, useMemo, useState } from 'react'
import { type ApplicationStatus, type JobApplication, parseStoredApplications } from '../types/jobApplication'

const STORAGE_KEY = 'job-tracker-applications-v1'

export type StatusFilter = ApplicationStatus | 'all'

function loadFromStorage(): JobApplication[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return parseStoredApplications(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

function saveToStorage(apps: JobApplication[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
}

export function useJobApplications() {
  const [applications, setApplications] = useState<JobApplication[]>(loadFromStorage)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  const add = useCallback((input: Omit<JobApplication, 'id'>) => {
    setApplications((prev) => {
      const next: JobApplication[] = [
        ...prev,
        { ...input, id: crypto.randomUUID() },
      ]
      saveToStorage(next)
      return next
    })
  }, [])

  const update = useCallback((id: string, input: Omit<JobApplication, 'id'>) => {
    setApplications((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...input, id: a.id } : a))
      saveToStorage(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setApplications((prev) => {
      const next = prev.filter((a) => a.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  const filteredApplications = useMemo(() => {
    const list =
      filterStatus === 'all'
        ? applications
        : applications.filter((a) => a.status === filterStatus)
    return [...list].sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
    )
  }, [applications, filterStatus])

  return {
    applications: filteredApplications,
    allCount: applications.length,
    filterStatus,
    setFilterStatus,
    add,
    update,
    remove,
  }
}
