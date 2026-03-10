import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading loyalty…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Loyalty() {
  const [overview, setOverview] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([api.get('/admin/loyalty/overview'), api.get('/admin/loyalty/tiers')])
      .then(([o, t]) => {
        if (cancelled) return;
        setOverview(o || null);
        setTiers(t?.tiers || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load loyalty data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const breakdown = overview?.tiers || [];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Loyalty</h1>
          <p className="panel-subtitle">View loyalty balances, tiers, and program health.</p>
        </div>
      </header>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <>
          {overview && (
            <div className="cards-grid">
              <article className="card">
                <h2>Total members</h2>
                <p>{overview.members ?? '—'}</p>
              </article>
              <article className="card">
                <h2>Total points</h2>
                <p>{overview.total_points ?? '—'}</p>
              </article>
              <article className="card">
                <h2>Avg. points per member</h2>
                <p>{overview.avg_points ?? '—'}</p>
              </article>
            </div>
          )}

          <div className="panel-columns">
            <section className="panel-section">
              <h2>Members by tier</h2>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Members</th>
                      <th>Min points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                          No tier data yet.
                        </td>
                      </tr>
                    ) : (
                      breakdown.map((row) => (
                        <tr key={row.id || row.name}>
                          <td>{row.name}</td>
                          <td>{row.members ?? '—'}</td>
                          <td>{row.min_points ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel-section">
              <h2>Tier configuration</h2>
              <p className="panel-subtitle">
                Edit tiers in your backend API; this view keeps the dashboard focused on monitoring.
              </p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Min points</th>
                      <th>Benefits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                          No tiers defined yet.
                        </td>
                      </tr>
                    ) : (
                      tiers.map((tier) => (
                        <tr key={tier.id}>
                          <td>{tier.name}</td>
                          <td>{tier.min_points}</td>
                          <td>{tier.benefits_summary || tier.description || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

