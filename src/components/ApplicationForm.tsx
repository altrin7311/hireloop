import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type JobApplication,
} from '../types/jobApplication'
import { todayIsoDate } from '../date'

type Props = {
  open: boolean
  formKey: number
  editing: JobApplication | null
  onClose: () => void
  onSave: (payload: Omit<JobApplication, 'id'>) => void
}

type BodyProps = {
  editing: JobApplication | null
  onClose: () => void
  onSave: (payload: Omit<JobApplication, 'id'>) => void
}

function ApplicationFormBody({ editing, onClose, onSave }: BodyProps) {
  const titleId = useId()
  const [company, setCompany] = useState(() => editing?.company ?? '')
  const [role, setRole] = useState(() => editing?.role ?? '')
  const [appliedAt, setAppliedAt] = useState(() =>
    editing ? editing.appliedAt.slice(0, 10) : todayIsoDate(),
  )
  const [status, setStatus] = useState<ApplicationStatus>(
    () => editing?.status ?? 'Applied',
  )
  const [jobUrl, setJobUrl] = useState(() => editing?.jobUrl ?? '')
  const [notes, setNotes] = useState(() => editing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    onClose()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const c = company.trim()
    const r = role.trim()
    if (!c || !r) {
      setError('Company and role are required.')
      return
    }
    setError(null)
    onSave({
      company: c,
      role: r,
      appliedAt: new Date(appliedAt + 'T12:00:00').toISOString(),
      status,
      jobUrl: jobUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    handleClose()
  }

  return (
    <div className="app-dialog__inner">
      <header className="app-dialog__header">
        <h2 id={titleId} className="app-dialog__title">
          {editing ? 'Edit application' : 'Add application'}
        </h2>
        <button
          type="button"
          className="app-btn app-btn--ghost"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <form className="app-form" onSubmit={handleSubmit} aria-labelledby={titleId}>
        {error ? (
          <p className="app-form__error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="app-field">
          <span className="app-field__label">Company</span>
          <input
            className="app-input"
            value={company}
            onChange={(e) => {
              setError(null)
              setCompany(e.target.value)
            }}
            autoComplete="organization"
            required
          />
        </label>
        <label className="app-field">
          <span className="app-field__label">Role</span>
          <input
            className="app-input"
            value={role}
            onChange={(e) => {
              setError(null)
              setRole(e.target.value)
            }}
            autoComplete="organization-title"
            required
          />
        </label>
        <label className="app-field">
          <span className="app-field__label">Applied</span>
          <input
            className="app-input"
            type="date"
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
            required
          />
        </label>
        <label className="app-field">
          <span className="app-field__label">Status</span>
          <select
            className="app-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="app-field">
          <span className="app-field__label">Job posting URL (optional)</span>
          <input
            className="app-input"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="app-field">
          <span className="app-field__label">Notes (optional)</span>
          <textarea
            className="app-input app-input--textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </label>
        <div className="app-dialog__actions">
          <button type="button" className="app-btn app-btn--ghost" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="app-btn app-btn--primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

export function ApplicationForm({
  open,
  formKey,
  editing,
  onClose,
  onSave,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      el.showModal()
    } else {
      el.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      aria-label={
        open
          ? editing
            ? 'Edit job application'
            : 'Add job application'
          : 'Job application dialog'
      }
      onClose={() => {
        onClose()
      }}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {open ? (
        <ApplicationFormBody
          key={formKey}
          editing={editing}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </dialog>
  )
}
