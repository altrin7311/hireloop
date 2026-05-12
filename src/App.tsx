import { useState } from 'react'
import { ApplicationForm } from './components/ApplicationForm'
import { ApplicationList } from './components/ApplicationList'
import { useJobApplications } from './hooks/useJobApplications'
import {
  APPLICATION_STATUSES,
  type JobApplication,
} from './types/jobApplication'
import './App.css'

function App() {
  const {
    applications,
    allCount,
    filterStatus,
    setFilterStatus,
    add,
    update,
    remove,
  } = useJobApplications()

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<JobApplication | null>(null)

  function openAdd() {
    setEditing(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  function openEdit(app: JobApplication) {
    setEditing(app)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  function handleSave(payload: Omit<JobApplication, 'id'>) {
    if (editing) {
      update(editing.id, payload)
    } else {
      add(payload)
    }
  }

  function handleDelete(app: JobApplication) {
    const ok = window.confirm(
      `Delete application at ${app.company} — ${app.role}?`,
    )
    if (ok) remove(app.id)
  }

  const totallyEmpty = allCount === 0
  const filterEmpty = !totallyEmpty && applications.length === 0

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Job applications</h1>
        <p className="app-subtitle">
          Track roles you have applied for. Data stays in this browser
          (localStorage).
        </p>
      </header>

      <div className="app-toolbar">
        <div className="app-filters" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={
              filterStatus === 'all' ? 'app-pill app-pill--active' : 'app-pill'
            }
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          {APPLICATION_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={
                filterStatus === s ? 'app-pill app-pill--active' : 'app-pill'
              }
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button type="button" className="app-btn app-btn--primary" onClick={openAdd}>
          Add application
        </button>
      </div>

      {totallyEmpty ? (
        <div className="app-empty">
          <p className="app-empty__title">No applications yet</p>
          <p className="app-empty__text">
            When you apply somewhere, add it here so you can follow status and
            links in one place.
          </p>
          <button type="button" className="app-btn app-btn--primary" onClick={openAdd}>
            Add your first application
          </button>
        </div>
      ) : filterEmpty ? (
        <div className="app-empty">
          <p className="app-empty__title">Nothing matches this filter</p>
          <p className="app-empty__text">
            Try another status or show all applications.
          </p>
          <button
            type="button"
            className="app-btn app-btn--ghost"
            onClick={() => setFilterStatus('all')}
          >
            Show all
          </button>
        </div>
      ) : (
        <ApplicationList
          applications={applications}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <ApplicationForm
        open={formOpen}
        formKey={formKey}
        editing={editing}
        onClose={closeForm}
        onSave={handleSave}
      />
    </div>
  )
}

export default App
