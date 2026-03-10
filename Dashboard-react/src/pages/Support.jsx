import { useEffect, useState } from 'react';
import api from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading tickets…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('q', search.trim());

    api
      .get(`/admin/support/tickets?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setTickets(data?.tickets || []);
        setSummary(data?.summary || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load support tickets.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Support Tickets</h1>
          <p className="panel-subtitle">Track customer issues, order problems, and ambassador queries.</p>
        </div>
      </header>

      {summary && (
        <div className="cards-grid">
          <article className="card">
            <h2>Open</h2>
            <p>{summary.open ?? '—'}</p>
          </article>
          <article className="card">
            <h2>Pending</h2>
            <p>{summary.pending ?? '—'}</p>
          </article>
          <article className="card">
            <h2>Resolved (7d)</h2>
            <p>{summary.resolved_7d ?? '—'}</p>
          </article>
        </div>
      )}

      <div className="panel-filters">
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            placeholder="Subject, customer, order #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center' }}>
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.subject}</td>
                    <td>{t.user_name || '—'}</td>
                    <td>{t.order_id || '—'}</td>
                    <td>{t.status}</td>
                    <td>{t.priority}</td>
                    <td>{t.assignee_name || 'Unassigned'}</td>
                    <td>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

