import { useEffect, useState } from 'react';
import api from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading security overview…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Security() {
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([api.get('/admin/security/overview'), api.get('/admin/security/events')])
      .then(([o, e]) => {
        if (cancelled) return;
        setOverview(o || null);
        setEvents(e?.events || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load security data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Security</h1>
          <p className="panel-subtitle">
            Monitor login activity and quickly spot risky access patterns.
          </p>
        </div>
      </header>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <>
          {overview && (
            <div className="cards-grid">
              <article className="card">
                <h2>Locked accounts</h2>
                <p>{overview.locked_accounts ?? '—'}</p>
              </article>
              <article className="card">
                <h2>Failed logins (24h)</h2>
                <p>{overview.failed_24h ?? '—'}</p>
              </article>
              <article className="card">
                <h2>Staff with MFA</h2>
                <p>{overview.staff_mfa_enabled ?? '—'}</p>
              </article>
            </div>
          )}

          <section className="panel-section" style={{ marginTop: '2rem' }}>
            <h2>Recent login events</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Result</th>
                    <th>IP</th>
                    <th>Location</th>
                    <th>User agent</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center' }}>
                        No login events yet.
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id}>
                        <td>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}</td>
                        <td>{ev.user_email || ev.user_name || '—'}</td>
                        <td>{ev.success ? 'Success' : 'Failed'}</td>
                        <td>{ev.ip_address || '—'}</td>
                        <td>
                          {ev.geo_city || ev.geo_country
                            ? `${ev.geo_city || ''}${ev.geo_city && ev.geo_country ? ', ' : ''}${
                                ev.geo_country || ''
                              }`
                            : '—'}
                        </td>
                        <td>{ev.user_agent || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

