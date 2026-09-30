import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError, apiRequest, downloadCsv, type User } from './api'

type CountRow = { name: string; count: number }
type Overview = {
  range: { from: string; to: string }
  totals: { tickets: number; open: number; resolved: number; averageResolutionHours: number | null; slaBreaches: number }
  byStatus: CountRow[]
  byPriority: CountRow[]
  byCategory: CountRow[]
  agentWorkload: CountRow[]
  volumeTrend: { date: string; count: number }[]
  slaEvents: CountRow[]
}

type ReportsPageProps = { user: User; onSessionExpired: () => void }

function dateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

const defaultReportTo = dateString(new Date())
const defaultReportFrom = dateString(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000))

export default function ReportsPage({ user, onSessionExpired }: ReportsPageProps) {
  const [from, setFrom] = useState(defaultReportFrom)
  const [to, setTo] = useState(defaultReportTo)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async (start = from, end = to) => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ from: start, to: end })
      setOverview(await apiRequest<Overview>(`/api/reports/overview?${query}`))
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired()
      setError(cause instanceof Error ? cause.message : 'Unable to load reports')
    } finally {
      setLoading(false)
    }
  }

  const loadInitialReport = useEffectEvent(() => {
    void load(defaultReportFrom, defaultReportTo)
  })

  useEffect(() => {
    loadInitialReport()
  }, [])

  const maxCount = (rows: CountRow[]) => Math.max(1, ...rows.map((row) => row.count))
  const renderBars = (rows: CountRow[]) => rows.length ? <ul className="bar-list">
    {rows.map((row) => <li key={row.name}><span>{row.name}</span><span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(2, row.count / maxCount(rows) * 100)}%` }} /></span><strong>{row.count}</strong></li>)}
  </ul> : <p className="empty-inline">No matching records.</p>

  const exportReport = async () => {
    setError('')
    try {
      await downloadCsv(`/api/reports/export.csv?${new URLSearchParams({ from, to })}`, `helpdesk-report-${from}-to-${to}.csv`)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired()
      setError(cause instanceof Error ? cause.message : 'Unable to export report')
    }
  }

  return (
    <section className="workspace-section" aria-labelledby="reports-title">
      <div className="workspace-heading report-heading">
        <div>
          <p className="eyebrow">Service performance</p>
          <h1 id="reports-title">Operational reports</h1>
          <p>Ticket activity and SLA outcomes for the selected period.</p>
        </div>
        <button className="secondary-button" type="button" disabled={loading} onClick={() => void exportReport()}>Export CSV</button>
      </div>

      <form className="report-filters" onSubmit={(event) => { event.preventDefault(); void load(from, to) }}>
        <label>From<input type="date" value={from} max={to || defaultReportTo} onChange={(event) => setFrom(event.target.value)} required /></label>
        <label>To<input type="date" value={to} min={from} max={defaultReportTo} onChange={(event) => setTo(event.target.value)} required /></label>
        <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Loading…' : 'Apply range'}</button>
        <span className="report-scope">Data scope: {user.role === 'Requester' ? 'your tickets' : user.role === 'Agent' ? 'your queue' : 'all tickets'}</span>
      </form>

      {error && <p className="feedback-message error-message" role="alert">{error}</p>}
      {loading && <p className="loading-inline" role="status">Updating report data…</p>}
      {!loading && overview && <>
        <div className="metric-strip" aria-label="Summary metrics">
          <div><span>Total tickets</span><strong>{overview.totals.tickets}</strong></div>
          <div><span>Open work</span><strong>{overview.totals.open}</strong></div>
          <div><span>Resolved</span><strong>{overview.totals.resolved}</strong></div>
          <div><span>Avg. resolution</span><strong>{overview.totals.averageResolutionHours === null ? '—' : `${overview.totals.averageResolutionHours}h`}</strong></div>
          <div><span>SLA breaches</span><strong className={overview.totals.slaBreaches ? 'metric-alert' : ''}>{overview.totals.slaBreaches}</strong></div>
        </div>

        <div className="report-grid">
          <section className="workspace-block report-block"><div className="block-heading"><div><h2>By status</h2><p>Tickets created in period</p></div></div>{renderBars(overview.byStatus)}</section>
          <section className="workspace-block report-block"><div className="block-heading"><div><h2>By priority</h2><p>Current priority distribution</p></div></div>{renderBars(overview.byPriority)}</section>
          <section className="workspace-block report-block"><div className="block-heading"><div><h2>By category</h2><p>Current category distribution</p></div></div>{renderBars(overview.byCategory)}</section>
          <section className="workspace-block report-block"><div className="block-heading"><div><h2>Active agent workload</h2><p>Open tickets by current assignee</p></div></div>{renderBars(overview.agentWorkload)}</section>
        </div>

        <section className="workspace-block trend-block">
          <div className="block-heading"><div><h2>Ticket volume</h2><p>Daily created tickets during {overview.range.from} to {overview.range.to}</p></div></div>
          {overview.volumeTrend.length ? <div className="volume-chart" role="img" aria-label={`${overview.volumeTrend.length} daily ticket volume values`}>
            {overview.volumeTrend.map((point) => <div className="volume-column" key={point.date} title={`${point.date}: ${point.count}`}><span style={{ height: `${Math.max(3, point.count / Math.max(1, ...overview.volumeTrend.map((item) => item.count)) * 100)}%` }} /><small>{point.date.slice(5)}</small></div>)}
          </div> : <p className="empty-inline">No tickets in this period.</p>}
        </section>
      </>}
    </section>
  )
}
