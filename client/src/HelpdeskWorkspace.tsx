import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import AdminPage from './AdminPage'
import ReportsPage from './ReportsPage'
import {
  ApiError,
  apiRequest,
  setCsrfToken,
  type AuditEvent,
  type Comment,
  type Notification,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
  type User,
} from './api'
import './App.css'

type View = 'tickets' | 'reports' | 'admin'
type FilterStatus = 'All' | TicketStatus
type FilterPriority = 'All' | TicketPriority

const statusValues: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed']
const priorityValues: TicketPriority[] = ['Critical', 'High', 'Medium', 'Low']
const demoAccounts = [
  { label: 'Requester', email: 'requester@helpdesk.local', password: 'Requester123!' },
  { label: 'Agent', email: 'agent@helpdesk.local', password: 'Agent123!' },
  { label: 'Manager', email: 'manager@helpdesk.local', password: 'Manager123!' },
  { label: 'Admin', email: 'admin@helpdesk.local', password: 'Admin123!' },
]

function statusClass(status: TicketStatus) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function slaLabel(state: string | undefined) {
  if (!state) return 'Not tracked'
  return state === 'at-risk' ? 'At risk' : state.replace(/-/g, ' ')
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function HelpdeskWorkspace() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState(demoAccounts[0].email)
  const [password, setPassword] = useState(demoAccounts[0].password)
  const [loginError, setLoginError] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [agents, setAgents] = useState<User[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [view, setView] = useState<View>('tickets')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [createMode, setCreateMode] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('All')
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('All')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ticketDraft, setTicketDraft] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'Medium' as TicketPriority,
  })
  const [commentDraft, setCommentDraft] = useState('')
  const [commentVisibility, setCommentVisibility] = useState<'public' | 'internal'>('public')
  const [statusDraft, setStatusDraft] = useState<TicketStatus>('Open')

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null
  const isStaff = user?.role === 'Agent' || user?.role === 'Manager' || user?.role === 'Admin'
  const canSeeAdmin = user?.role === 'Admin'
  const unreadCount = notifications.filter((item) => !item.readAt).length

  function expireSession() {
    setCsrfToken('')
    setUser(null)
    setTickets([])
    setTicketModalOpen(false)
    setError('Your session expired. Sign in again to continue.')
  }

  async function loadWorkspace(currentUser: User) {
    try {
      const [ticketResult, categoryResult, notificationResult] = await Promise.all([
        apiRequest<{ tickets: Ticket[] }>('/api/tickets'),
        apiRequest<{ categories: string[] }>('/api/categories'),
        apiRequest<{ notifications: Notification[] }>('/api/notifications'),
      ])
      setTickets(ticketResult.tickets)
      setCategories(categoryResult.categories)
      setNotifications(notificationResult.notifications)
      if (currentUser.role !== 'Requester') {
        const agentResult = await apiRequest<{ agents: User[] }>('/api/agents')
        setAgents(agentResult.agents)
      } else {
        setAgents([])
      }
      setSelectedTicketId((current) => current && ticketResult.tickets.some((ticket) => ticket.id === current)
        ? current
        : ticketResult.tickets[0]?.id ?? null)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        expireSession()
        return
      }
      setError(cause instanceof Error ? cause.message : 'Could not load the helpdesk workspace')
    }
  }

  const loadWorkspaceFromEffect = useEffectEvent((currentUser: User) => {
    void loadWorkspace(currentUser)
  })

  const refreshNotificationsFromEffect = useEffectEvent(() => {
    apiRequest<{ notifications: Notification[] }>('/api/notifications')
      .then((result) => setNotifications(result.notifications))
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 401) expireSession()
      })
  })

  useEffect(() => {
    apiRequest<{ user: User; csrfToken: string }>('/api/auth/me')
      .then((session) => {
        setCsrfToken(session.csrfToken)
        setUser(session.user)
      })
      .catch(() => setCsrfToken(''))
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    loadWorkspaceFromEffect(user)
    const interval = window.setInterval(refreshNotificationsFromEffect, 30000)
    return () => window.clearInterval(interval)
  }, [user])

  const loadTicketDetailsFromEffect = useEffectEvent((ticketId: string, currentUser: User) => {
    const loadDetails = async () => {
      try {
        const commentResult = await apiRequest<{ comments: Comment[] }>(`/api/tickets/${ticketId}/comments`)
        setComments(commentResult.comments)
        if (currentUser.role !== 'Requester') {
          const auditResult = await apiRequest<{ events: AuditEvent[] }>(`/api/tickets/${ticketId}/audit`)
          setAuditEvents(auditResult.events)
        } else {
          setAuditEvents([])
        }
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) expireSession()
        else setError(cause instanceof Error ? cause.message : 'Could not load ticket activity')
      }
    }
    void loadDetails()
  })

  useEffect(() => {
    if (!ticketModalOpen || !selectedTicket || !user) return
    loadTicketDetailsFromEffect(selectedTicket.id, user)
  }, [ticketModalOpen, selectedTicket, user])

  const closeDialogOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') closeTicket()
  })

  useEffect(() => {
    if (!ticketModalOpen) return
    window.addEventListener('keydown', closeDialogOnEscape)
    return () => window.removeEventListener('keydown', closeDialogOnEscape)
  }, [ticketModalOpen])

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = !normalizedQuery || [ticket.id, ticket.subject, ticket.category, ticket.assignee ?? '']
      .some((value) => value.toLowerCase().includes(normalizedQuery))
    return matchesStatus && matchesPriority && matchesQuery
  }), [tickets, statusFilter, priorityFilter, query])

  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visibleTickets = filteredTickets.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function signIn(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setBusy(true)
    setLoginError('')
    try {
      const session = await apiRequest<{ user: User; csrfToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setCsrfToken(session.csrfToken)
      setUser(session.user)
      setError('')
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // The local view is cleared even if the server session has expired.
    }
    setCsrfToken('')
    setUser(null)
    setTickets([])
    setView('tickets')
    setTicketModalOpen(false)
    setPassword('')
  }

  async function reloadTickets() {
    const result = await apiRequest<{ tickets: Ticket[] }>('/api/tickets')
    setTickets(result.tickets)
  }

  async function reloadAudit(ticketId: string) {
    if (user?.role === 'Requester') return
    const result = await apiRequest<{ events: AuditEvent[] }>(`/api/tickets/${ticketId}/audit`)
    setAuditEvents(result.events)
  }

  async function perform(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) expireSession()
      else setError(cause instanceof Error ? cause.message : 'The request could not be completed')
    } finally {
      setBusy(false)
    }
  }

  function startNewTicket() {
    setCreateMode(true)
    setEditing(false)
    setTicketDraft({ subject: '', description: '', category: categories[0] ?? '', priority: 'Medium' })
    setTicketModalOpen(true)
  }

  function openTicket(ticket: Ticket) {
    setSelectedTicketId(ticket.id)
    setStatusDraft(ticket.status)
    setCommentDraft('')
    setCommentVisibility('public')
    setCreateMode(false)
    setEditing(false)
    setTicketModalOpen(true)
    setError('')
  }

  function closeTicket() {
    setTicketModalOpen(false)
    setEditing(false)
    setCreateMode(false)
    setError('')
  }

  async function saveTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      subject: ticketDraft.subject.trim(),
      description: ticketDraft.description.trim(),
      category: ticketDraft.category,
      priority: ticketDraft.priority,
    }
    await perform(async () => {
      if (createMode) {
        const result = await apiRequest<{ ticket: Ticket }>('/api/tickets', { method: 'POST', body: JSON.stringify(payload) })
        await reloadTickets()
        setSelectedTicketId(result.ticket.id)
        setCreateMode(false)
        setNotice('Ticket created.')
      } else if (selectedTicket) {
        await apiRequest(`/api/tickets/${selectedTicket.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        await reloadTickets()
        await reloadAudit(selectedTicket.id)
        setEditing(false)
        setNotice('Ticket updated.')
      }
    })
  }

  async function changeStatus(status: TicketStatus) {
    if (!selectedTicket) return
    await perform(async () => {
      await apiRequest(`/api/tickets/${selectedTicket.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await reloadTickets()
      await reloadAudit(selectedTicket.id)
      setNotice('Status updated.')
    })
  }

  async function changeAssignee(assigneeId: number | null) {
    if (!selectedTicket) return
    await perform(async () => {
      await apiRequest(`/api/tickets/${selectedTicket.id}/assignment`, { method: 'PUT', body: JSON.stringify({ assigneeId }) })
      await reloadTickets()
      await reloadAudit(selectedTicket.id)
      setNotice('Assignment updated.')
    })
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTicket) return
    await perform(async () => {
      const result = await apiRequest<{ comment: Comment }>(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentDraft, visibility: commentVisibility }),
      })
      setComments((current) => [...current, result.comment])
      setCommentDraft('')
      setNotice('Comment added.')
      await reloadAudit(selectedTicket.id)
      await reloadTickets()
    })
  }

  async function deleteTicket() {
    if (!selectedTicket || !window.confirm(`Archive ${selectedTicket.id}? It will be removed from active ticket lists and retained in the audit history.`)) return
    await perform(async () => {
      await apiRequest(`/api/tickets/${selectedTicket.id}`, { method: 'DELETE' })
      await reloadTickets()
      setTicketModalOpen(false)
      setSelectedTicketId(null)
      setNotice('Ticket archived.')
    })
  }

  async function refreshNotifications() {
    const result = await apiRequest<{ notifications: Notification[] }>('/api/notifications')
    setNotifications(result.notifications)
  }

  async function markRead(notification: Notification) {
    if (notification.readAt) return
    await perform(async () => {
      await apiRequest(`/api/notifications/${notification.id}/read`, { method: 'PATCH', body: '{}' })
      await refreshNotifications()
    })
  }

  async function markAllRead() {
    await perform(async () => {
      await apiRequest('/api/notifications/read-all', { method: 'PATCH', body: '{}' })
      await refreshNotifications()
    })
  }

  if (authLoading) return <main className="auth-shell"><p role="status">Checking your session…</p></main>

  if (!user) return <main className="auth-shell">
    <section className="login-panel">
      <div className="login-brand"><span className="brand-mark">HD</span><span>HelpDesk <strong>Operations</strong></span></div>
      <p className="eyebrow">Support workspace</p>
      <h1>Sign in</h1>
      <p className="login-copy">Access tickets, service targets, and team operations.</p>
      <form className="login-form" onSubmit={(event) => void signIn(event)}>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {loginError && <p className="feedback-message error-message" role="alert">{loginError}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      {import.meta.env.DEV && <div className="demo-access"><span>Local demo access</span><div>{demoAccounts.map((account) => <button key={account.label} type="button" onClick={() => { setEmail(account.email); setPassword(account.password) }}>{account.label}</button>)}</div></div>}
    </section>
  </main>

  return <div className="helpdesk-shell">
    <header className="top-header">
      <button className="header-brand" type="button" onClick={() => setView('tickets')}><span className="brand-mark">HD</span><span>HelpDesk <strong>Operations</strong></span></button>
      <div className="header-tools">
        <div className="notification-control">
          <button className="notification-toggle" type="button" aria-expanded={showNotifications} onClick={() => setShowNotifications((current) => !current)}>Notifications{unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}</button>
          {showNotifications && <div className="notification-menu" role="region" aria-label="Notifications">
            <div className="notification-menu-heading"><strong>Notifications</strong><button type="button" className="link-button" onClick={() => void markAllRead()} disabled={unreadCount === 0}>Mark all read</button></div>
            {notifications.length === 0 ? <p className="empty-inline">No notifications yet.</p> : notifications.map((item) => <button key={item.id} type="button" className={`notification-item ${item.readAt ? '' : 'unread'}`} onClick={() => {
              void markRead(item)
              if (item.ticketId) {
                const ticket = tickets.find((entry) => entry.id === item.ticketId)
                if (ticket) openTicket(ticket)
              }
            }}><strong>{item.title}</strong><span>{item.message}</span><small>{formatDate(item.createdAt)}</small></button>)}
          </div>}
        </div>
        <div className="user-summary"><span className="avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role} · {user.employeeId || user.email}</small></span></div>
        <button className="signout-button" type="button" onClick={() => void signOut()}>Sign out</button>
      </div>
    </header>

    <div className="workspace-layout">
      <aside className="sidebar" aria-label="Main navigation">
        <p className="sidebar-caption">Workspace</p>
        <button type="button" className={view === 'tickets' ? 'sidebar-item active' : 'sidebar-item'} onClick={() => setView('tickets')}>Tickets<span>{tickets.length}</span></button>
        {user.role !== 'Requester' && <button type="button" className={view === 'reports' ? 'sidebar-item active' : 'sidebar-item'} onClick={() => setView('reports')}>Reports</button>}
        {canSeeAdmin && <button type="button" className={view === 'admin' ? 'sidebar-item active' : 'sidebar-item'} onClick={() => setView('admin')}>Administration</button>}
        <div className="sidebar-identity"><span className="online-dot" />Signed in as {user.role}</div>
      </aside>

      <main className="main-panel">
        {error && <div className="workspace-feedback"><p className="feedback-message error-message" role="alert">{error}</p><button type="button" className="link-button" onClick={() => setError('')}>Dismiss</button></div>}
        {notice && <p className="feedback-message success-message" role="status">{notice}</p>}

        {view === 'tickets' && <section className="workspace-section" aria-labelledby="tickets-title">
          <div className="workspace-heading"><div><p className="eyebrow">Service desk</p><h1 id="tickets-title">Tickets</h1><p>{user.role === 'Requester' ? 'Track requests submitted by your account.' : 'Review and manage support work across your queue.'}</p></div><button type="button" className="primary-button" onClick={startNewTicket}>New ticket</button></div>

          <div className="ticket-toolbar">
            <label className="search-field"><span className="sr-only">Search tickets</span><input type="search" placeholder="Search tickets" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label>
            <label>Status<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as FilterStatus); setPage(1) }}><option>All</option>{statusValues.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>Priority<select value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value as FilterPriority); setPage(1) }}><option>All</option>{priorityValues.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            <span className="ticket-count">{filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}</span>
          </div>

          <div className="table-wrap ticket-table-wrap"><table>
            <thead><tr><th>Ticket</th><th>Requester</th><th>Category</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Response SLA</th><th>Updated</th></tr></thead>
            <tbody>{visibleTickets.map((ticket) => <tr key={ticket.id}>
              <td><button type="button" className="ticket-open-link" onClick={() => openTicket(ticket)}><strong>{ticket.id}</strong><span>{ticket.subject}</span></button></td>
              <td>{ticket.requester}</td><td>{ticket.category}</td>
              <td><span className={`priority-badge ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
              <td><span className={`status-badge ${statusClass(ticket.status)}`}>{ticket.status}</span></td>
              <td>{ticket.assignee || <span className="muted-value">Unassigned</span>}</td>
              <td><span className={`sla-badge ${ticket.sla.response?.state ?? 'stopped'}`}>{slaLabel(ticket.sla.response?.state)}</span></td>
              <td>{ticket.lastUpdated}</td>
            </tr>)}
            {visibleTickets.length === 0 && <tr><td className="empty-table" colSpan={8}>{tickets.length ? 'No tickets match these filters.' : 'No tickets yet. Create a ticket to get started.'}</td></tr>}
            </tbody>
          </table></div>

          <div className="pagination-row"><span>Showing {filteredTickets.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filteredTickets.length)} of {filteredTickets.length}</span><div className="pager"><button className="pager-button" type="button" disabled={safePage <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>{safePage} / {pageCount}</span><button className="pager-button" type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
        </section>}

        {view === 'reports' && <ReportsPage user={user} onSessionExpired={expireSession} />}
        {view === 'admin' && canSeeAdmin && <AdminPage onSessionExpired={expireSession} />}
      </main>
    </div>

    {ticketModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTicket() }}>
      <section className="ticket-modal expanded-ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
        <div className="modal-header"><div><p className="eyebrow">{createMode ? 'New request' : 'Ticket record'}</p><h2 id="ticket-modal-title">{createMode ? 'Create ticket' : selectedTicket?.id}</h2></div><button type="button" className="close-button" aria-label="Close ticket dialog" onClick={closeTicket}>×</button></div>
        {createMode || editing ? <form className="modal-body ticket-edit-form" onSubmit={(event) => void saveTicket(event)}>
          <label>Subject<input required maxLength={200} value={ticketDraft.subject} onChange={(event) => setTicketDraft({ ...ticketDraft, subject: event.target.value })} /></label>
          <label>Description<textarea rows={4} maxLength={10000} value={ticketDraft.description} onChange={(event) => setTicketDraft({ ...ticketDraft, description: event.target.value })} /></label>
          <div className="form-pair"><label>Category<select required value={ticketDraft.category} onChange={(event) => setTicketDraft({ ...ticketDraft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Priority<select value={ticketDraft.priority} onChange={(event) => setTicketDraft({ ...ticketDraft, priority: event.target.value as TicketPriority })}>{priorityValues.map((priority) => <option key={priority}>{priority}</option>)}</select></label></div>
          {error && <p className="feedback-message error-message" role="alert">{error}</p>}
          <div className="modal-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : createMode ? 'Create ticket' : 'Save changes'}</button><button className="secondary-button" type="button" onClick={() => createMode ? closeTicket() : setEditing(false)}>Cancel</button></div>
        </form> : selectedTicket && <div className="modal-body ticket-detail-body">
          {error && <p className="feedback-message error-message" role="alert">{error}</p>}
          <div className="ticket-summary-line"><div><span className={`status-badge ${statusClass(selectedTicket.status)}`}>{selectedTicket.status}</span><span className={`priority-badge ${selectedTicket.priority.toLowerCase()}`}>{selectedTicket.priority}</span></div><span>Updated {selectedTicket.lastUpdated}</span></div>
          <div className="detail-grid ticket-meta-grid">
            <div><span className="detail-label">Subject</span><strong>{selectedTicket.subject}</strong></div><div><span className="detail-label">Category</span><strong>{selectedTicket.category}</strong></div>
            <div><span className="detail-label">Requester</span><strong>{selectedTicket.requester} · {selectedTicket.requesterEmail}</strong></div><div><span className="detail-label">Assignee</span><strong>{selectedTicket.assignee || 'Unassigned'}</strong></div>
            <div><span className="detail-label">Created</span><strong>{formatDate(selectedTicket.createdAt)}</strong></div><div><span className="detail-label">First response</span><strong>{selectedTicket.firstResponseAt ? formatDate(selectedTicket.firstResponseAt) : 'Awaiting response'}</strong></div>
          </div>
          {selectedTicket.description && <div className="subject-block"><span className="detail-label">Description</span><p>{selectedTicket.description}</p></div>}
          <div className="sla-detail-row"><div><span className="detail-label">First response SLA</span><strong className={`sla-badge ${selectedTicket.sla.response?.state ?? 'stopped'}`}>{slaLabel(selectedTicket.sla.response?.state)}</strong><small>{selectedTicket.sla.response?.dueAt ? `Due ${formatDate(selectedTicket.sla.response.dueAt)}` : 'Complete'}</small></div><div><span className="detail-label">Resolution SLA</span><strong className={`sla-badge ${selectedTicket.sla.resolution?.state ?? 'stopped'}`}>{slaLabel(selectedTicket.sla.resolution?.state)}</strong><small>{selectedTicket.sla.resolution?.dueAt ? `Due ${formatDate(selectedTicket.sla.resolution.dueAt)}` : 'Complete'}</small></div></div>

          {isStaff && <div className="ticket-actions-block">
            <div className="status-update-row"><label>Change status<select value={statusDraft} disabled={busy} onChange={(event) => setStatusDraft(event.target.value as TicketStatus)}>{statusValues.map((status) => <option key={status}>{status}</option>)}</select></label><button className="secondary-button" type="button" disabled={busy || statusDraft === selectedTicket.status} onClick={() => void changeStatus(statusDraft)}>Apply</button></div>
            {user.role === 'Manager' || user.role === 'Admin' ? <div className="status-update-row"><label>Assign to Agent<select value={selectedTicket.assigneeId ?? ''} disabled={busy} onChange={(event) => void changeAssignee(event.target.value ? Number(event.target.value) : null)}><option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></div> : user.role === 'Agent' && selectedTicket.assigneeId === null ? <button className="secondary-button" type="button" disabled={busy} onClick={() => void changeAssignee(user.id)}>Claim ticket</button> : null}
            {(user.role === 'Manager' || user.role === 'Admin' || selectedTicket.assigneeId === user.id || selectedTicket.assigneeId === null) && <button className="link-button" type="button" onClick={() => { setTicketDraft({ subject: selectedTicket.subject, description: selectedTicket.description, category: selectedTicket.category, priority: selectedTicket.priority }); setEditing(true) }}>Edit ticket details</button>}
            {user.role === 'Admin' && <button className="danger-button" type="button" disabled={busy} onClick={() => void deleteTicket()}>Archive ticket</button>}
          </div>}

          <section className="activity-section" aria-labelledby="comments-title"><div className="block-heading"><div><h3 id="comments-title">Conversation</h3><p>Public replies are visible to the requester; internal notes are staff-only.</p></div></div>
            <div className="comment-list">{comments.map((comment) => <article className={`comment-entry ${comment.visibility}`} key={comment.id}><div><strong>{comment.author}</strong><span>{comment.visibility === 'internal' ? 'Internal note' : 'Public reply'}</span><time>{formatDate(comment.createdAt)}</time></div><p>{comment.body}</p></article>)}{comments.length === 0 && <p className="empty-inline">No replies yet.</p>}</div>
            <form className="comment-form" onSubmit={(event) => void addComment(event)}><label>{isStaff ? 'Add a reply or note' : 'Add a reply'}<textarea value={commentDraft} maxLength={10000} rows={3} required onChange={(event) => setCommentDraft(event.target.value)} /></label><div className="comment-actions">{isStaff && <label>Visibility<select value={commentVisibility} onChange={(event) => setCommentVisibility(event.target.value as 'public' | 'internal')}><option value="public">Public reply</option><option value="internal">Internal note</option></select></label>}<button type="submit" className="primary-button" disabled={busy || !commentDraft.trim()}>Add comment</button></div></form>
          </section>

          {isStaff && <section className="activity-section audit-section"><div className="block-heading"><div><h3>Audit history</h3><p>Append-only record of ticket changes and service events.</p></div></div><ol className="audit-list">{auditEvents.map((event) => <li key={event.id}><span className="audit-dot" /><div><strong>{event.action.replaceAll('_', ' ')}</strong><p>{event.actor} · {event.actorRole}</p><time>{formatDate(event.createdAt)}</time></div></li>)}{auditEvents.length === 0 && <li className="empty-inline">No recorded changes.</li>}</ol></section>}
        </div>}
      </section>
    </div>}
  </div>
}
