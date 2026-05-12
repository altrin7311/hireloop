import type { JobApplication } from '../types/jobApplication'

type Props = {
  applications: JobApplication[]
  onEdit: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function ExternalLinkIcon() {
  return (
    <svg
      className="app-link-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function ApplicationList({ applications, onEdit, onDelete }: Props) {
  return (
    <>
      <div className="app-table-wrap" role="region" aria-label="Applications table">
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Role</th>
              <th scope="col">Applied</th>
              <th scope="col">Status</th>
              <th scope="col">Link</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>{app.company}</td>
                <td>{app.role}</td>
                <td>{formatDate(app.appliedAt)}</td>
                <td>
                  <span className={`app-badge app-badge--${app.status.toLowerCase()}`}>
                    {app.status}
                  </span>
                </td>
                <td>
                  {app.jobUrl ? (
                    <a
                      className="app-table-link"
                      href={app.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open posting for ${app.company}`}
                    >
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <span className="app-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="app-row-actions">
                    <button
                      type="button"
                      className="app-btn app-btn--small app-btn--ghost"
                      onClick={() => onEdit(app)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="app-btn app-btn--small app-btn--danger"
                      onClick={() => onDelete(app)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="app-card-list" aria-label="Applications">
        {applications.map((app) => (
          <li key={app.id} className="app-card">
            <div className="app-card__row">
              <strong className="app-card__title">{app.company}</strong>
              <span className={`app-badge app-badge--${app.status.toLowerCase()}`}>
                {app.status}
              </span>
            </div>
            <p className="app-card__role">{app.role}</p>
            <p className="app-card__meta">Applied {formatDate(app.appliedAt)}</p>
            {app.jobUrl ? (
              <p className="app-card__link">
                <a href={app.jobUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon /> View posting
                </a>
              </p>
            ) : null}
            {app.notes ? <p className="app-card__notes">{app.notes}</p> : null}
            <div className="app-card__actions">
              <button
                type="button"
                className="app-btn app-btn--small app-btn--ghost"
                onClick={() => onEdit(app)}
              >
                Edit
              </button>
              <button
                type="button"
                className="app-btn app-btn--small app-btn--danger"
                onClick={() => onDelete(app)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
