import { Fragment, useEffect, useEffectEvent, useState } from 'react'
import { ApiError, apiRequest, type Category, type SlaPolicy, type User, type UserRole } from './api'

type AdminUser = User & {
  notifyAssignments: boolean
  notifyComments: boolean
  notifySla: boolean
  createdAt: string
}

type SystemEvent = {
  id: number
  actor: string
  actorRole: string
  entityType: string
  entityId: string
  action: string
  details: Record<string, unknown>
  createdAt: string
}

const roles: UserRole[] = ['Requester', 'Agent', 'Manager', 'Admin']
const priorities: SlaPolicy['priority'][] = ['Critical', 'High', 'Medium', 'Low']

type AdminPageProps = { onSessionExpired: () => void }

export default function AdminPage({ onSessionExpired }: AdminPageProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [events, setEvents] = useState<SystemEvent[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', employeeId: '', role: 'Requester' as UserRole, password: '' })
  const [resettingUserId, setResettingUserId] = useState<number | null>(null)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    try {
      const [userResult, categoryResult, policyResult, auditResult] = await Promise.all([
        apiRequest<{ users: AdminUser[] }>('/api/admin/users'),
        apiRequest<{ categories: Category[] }>('/api/admin/categories'),
        apiRequest<{ policies: SlaPolicy[] }>('/api/admin/sla-policies'),
        apiRequest<{ events: SystemEvent[] }>('/api/admin/system-audit'),
      ])
      setUsers(userResult.users)
      setCategories(categoryResult.categories)
      setPolicies(policyResult.policies)
      setEvents(auditResult.events)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired()
      setError(cause instanceof Error ? cause.message : 'Unable to load administration data')
    }
  }

  const loadInitialAdminData = useEffectEvent(() => {
    void load()
  })

  useEffect(() => {
    loadInitialAdminData()
  }, [])

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await load()
      setNotice(successMessage)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired()
      setError(cause instanceof Error ? cause.message : 'The action could not be completed')
    } finally {
      setBusy(false)
    }
  }

  const updateUser = async (userId: number, values: Record<string, unknown>) => {
    await apiRequest(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(values) })
  }

  const createUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAction(async () => {
      await apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(newUser) })
      setNewUser({ name: '', email: '', employeeId: '', role: 'Requester', password: '' })
    }, 'User account created.')
  }

  const addCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAction(async () => {
      await apiRequest('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: newCategory }) })
      setNewCategory('')
    }, 'Category added.')
  }

  const savePolicy = (policy: SlaPolicy) => {
    void runAction(async () => {
      await apiRequest(`/api/admin/sla-policies/${encodeURIComponent(policy.priority)}`, {
        method: 'PUT',
        body: JSON.stringify({ responseHours: policy.responseHours, resolutionHours: policy.resolutionHours }),
      })
    }, `${policy.priority} SLA targets saved.`)
  }

  return (
    <section className="workspace-section" aria-labelledby="admin-title">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1 id="admin-title">Administration</h1>
          <p>Manage staff access, ticket categories, and service targets.</p>
        </div>
      </div>

      {error && <p className="feedback-message error-message" role="alert">{error}</p>}
      {notice && <p className="feedback-message success-message" role="status">{notice}</p>}

      <section className="workspace-block" aria-labelledby="users-title">
        <div className="block-heading">
          <div>
            <h2 id="users-title">User accounts</h2>
            <p>Roles control which ticket records and actions each account can access.</p>
          </div>
        </div>
        <form className="admin-create-form" onSubmit={createUser}>
          <label>Name<input required maxLength={120} value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} /></label>
          <label>Email<input required type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
          <label>Employee ID<input value={newUser.employeeId} onChange={(event) => setNewUser({ ...newUser, employeeId: event.target.value })} /></label>
          <label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as UserRole })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label>Temporary password<input required type="password" minLength={12} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
          <button type="submit" className="primary-button" disabled={busy}>Create user</button>
        </form>
        <div className="table-wrap admin-table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Account</th><th>Notifications</th><th>Security</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <Fragment key={user.id}>
                  <tr>
                    <td>{user.name}<small>{user.employeeId || 'No employee ID'}</small></td>
                    <td>{user.email}</td>
                    <td><select aria-label={`Role for ${user.name}`} value={user.role} disabled={busy} onChange={(event) => void runAction(() => updateUser(user.id, { role: event.target.value }), 'Role updated. The user must sign in again.')}>{roles.map((role) => <option key={role}>{role}</option>)}</select></td>
                    <td><label className="inline-check"><input type="checkbox" checked={user.active} disabled={busy} onChange={(event) => void runAction(() => updateUser(user.id, { active: event.target.checked }), 'Account status updated.')} />Active</label></td>
                    <td><div className="preference-list">
                      <label className="inline-check"><input type="checkbox" checked={user.notifyAssignments} disabled={busy} onChange={(event) => void runAction(() => updateUser(user.id, { notifyAssignments: event.target.checked }), 'Notification preferences saved.')} />Assignments</label>
                      <label className="inline-check"><input type="checkbox" checked={user.notifyComments} disabled={busy} onChange={(event) => void runAction(() => updateUser(user.id, { notifyComments: event.target.checked }), 'Notification preferences saved.')} />Comments</label>
                      <label className="inline-check"><input type="checkbox" checked={user.notifySla} disabled={busy} onChange={(event) => void runAction(() => updateUser(user.id, { notifySla: event.target.checked }), 'Notification preferences saved.')} />SLA</label>
                    </div></td>
                    <td><button className="link-button" type="button" disabled={busy} onClick={() => { setResettingUserId(user.id); setPasswordDraft('') }}>{resettingUserId === user.id ? 'Reset open' : 'Reset password'}</button></td>
                  </tr>
                  {resettingUserId === user.id && <tr><td colSpan={6}><form className="inline-create-form" onSubmit={(event) => {
                    event.preventDefault()
                    void runAction(async () => {
                      await updateUser(user.id, { password: passwordDraft })
                      setResettingUserId(null)
                      setPasswordDraft('')
                    }, 'Password reset. The user must sign in again.')
                  }}><label>New password<input type="password" minLength={12} required value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} /></label><button className="secondary-button" type="submit" disabled={busy}>Update password</button><button className="link-button" type="button" onClick={() => setResettingUserId(null)}>Cancel</button></form></td></tr>}
                </Fragment>
              ))}
              {users.length === 0 && <tr><td colSpan={6}>No accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-two-column">
        <section className="workspace-block" aria-labelledby="categories-title">
          <div className="block-heading"><div><h2 id="categories-title">Ticket categories</h2><p>Deactivate categories instead of deleting ticket history.</p></div></div>
          <form className="inline-create-form" onSubmit={addCategory}>
            <label className="sr-only" htmlFor="new-category">New category</label>
            <input id="new-category" value={newCategory} maxLength={80} required placeholder="New category name" onChange={(event) => setNewCategory(event.target.value)} />
            <button className="secondary-button" type="submit" disabled={busy}>Add</button>
          </form>
          <ul className="settings-list">
            {categories.map((category) => <li key={category.name}><span>{category.name}</span><label className="inline-check"><input type="checkbox" checked={category.active} disabled={busy} onChange={(event) => void runAction(() => apiRequest(`/api/admin/categories/${encodeURIComponent(category.name)}`, { method: 'PATCH', body: JSON.stringify({ active: event.target.checked }) }).then(() => undefined), 'Category status updated.')} />Active</label></li>)}
          </ul>
        </section>

        <section className="workspace-block" aria-labelledby="sla-policy-title">
          <div className="block-heading"><div><h2 id="sla-policy-title">SLA targets</h2><p>Targets use 24/7 elapsed time. Warnings begin at 75%.</p></div></div>
          <div className="policy-list">
            {priorities.map((priority) => {
              const policy = policies.find((item) => item.priority === priority)
              if (!policy) return null
              return <div className="policy-row" key={priority}>
                <strong>{priority}</strong>
                <label>First response (hours)<input type="number" min="0.25" max="8760" step="0.25" value={policy.responseHours} onChange={(event) => setPolicies((current) => current.map((item) => item.priority === priority ? { ...item, responseHours: Number(event.target.value) } : item))} /></label>
                <label>Resolution (hours)<input type="number" min="0.25" max="8760" step="0.25" value={policy.resolutionHours} onChange={(event) => setPolicies((current) => current.map((item) => item.priority === priority ? { ...item, resolutionHours: Number(event.target.value) } : item))} /></label>
                <button className="secondary-button" type="button" disabled={busy} onClick={() => savePolicy(policy)}>Save</button>
              </div>
            })}
          </div>
        </section>
      </div>

      <section className="workspace-block" aria-labelledby="system-audit-title">
        <div className="block-heading"><div><h2 id="system-audit-title">Administration history</h2><p>Recent user, role, category, and SLA configuration changes.</p></div></div>
        <div className="table-wrap admin-table-wrap">
          <table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Record</th><th>Change</th></tr></thead>
            <tbody>{events.map((event) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString()}</td><td>{event.actor}<small>{event.actorRole}</small></td><td>{event.action.replaceAll('_', ' ')}</td><td>{event.entityType} {event.entityId}</td><td><code>{JSON.stringify(event.details)}</code></td></tr>)}{events.length === 0 && <tr><td colSpan={5}>No administration changes recorded.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
