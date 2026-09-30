export type UserRole = 'Requester' | 'Agent' | 'Manager' | 'Admin'

export type User = {
  id: number
  email: string
  name: string
  employeeId: string | null
  role: UserRole
  active: boolean
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'
export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type SlaState = 'on-track' | 'at-risk' | 'breached' | 'met' | 'stopped'

export type Ticket = {
  id: string
  subject: string
  description: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  requesterId: number
  requester: string
  requesterEmail: string
  assigneeId: number | null
  assignee: string | null
  assigneeEmail: string | null
  createdAt: string
  lastUpdated: string
  firstResponseAt: string | null
  resolvedAt: string | null
  sla: {
    response: { state: SlaState; dueAt: string; remainingMs: number } | null
    resolution: { state: SlaState; dueAt: string; remainingMs: number } | null
  }
}

export type Comment = {
  id: number
  ticketId: string
  authorId: number
  author: string
  visibility: 'public' | 'internal'
  body: string
  createdAt: string
}

export type AuditEvent = {
  id: number
  ticketId: string
  actorId: number | null
  actor: string
  actorRole: string
  action: string
  details: Record<string, unknown>
  createdAt: string
}

export type Notification = {
  id: number
  ticketId: string | null
  eventKey: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export type Category = { name: string; active: boolean; createdAt?: string }
export type SlaPolicy = { priority: TicketPriority; responseHours: number; resolutionHours: number; active: boolean }

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let csrfToken = ''

export function setCsrfToken(token: string) {
  csrfToken = token
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  const init: RequestInit = { ...options, method, headers, credentials: 'same-origin', cache: 'no-store' }

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
    if (typeof init.body !== 'string') init.body = JSON.stringify(init.body)
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(path, init)
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      ? String(payload.error)
      : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return payload as T
}

export async function downloadCsv(path: string, filename: string) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new ApiError(payload.error ?? `Request failed (${response.status})`, response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
