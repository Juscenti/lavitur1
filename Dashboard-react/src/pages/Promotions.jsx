import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading promotions…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Promotions() {
  const [codes, setCodes] = useState([]);
  const [onlyActive, setOnlyActive] = useState(true);
  const [ambassadorOnly, setAmbassadorOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (onlyActive) params.set('active', 'true');
    if (ambassadorOnly) params.set('ambassador_only', 'true');

    api
      .get(`/admin/promotions/discount-codes?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setCodes(data?.codes || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load discount codes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onlyActive, ambassadorOnly]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Promotions</h1>
          <p className="panel-subtitle">
            Manage discount codes, campaigns, and ambassador attribution.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            // eslint-disable-next-line no-alert
            alert('Discount creation flow will live here.');
          }}
        >
          + New discount
        </button>
      </header>

      <div className="panel-filters">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          <span>Show only active</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={ambassadorOnly}
            onChange={(e) => setAmbassadorOnly(e.target.checked)}
          />
          <span>Ambassador codes only</span>
        </label>
      </div>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Ambassador</th>
                <th>Campaign</th>
                <th>Usage</th>
                <th>Revenue (JMD)</th>
                <th>Valid</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center' }}>
                    No discount codes found.
                  </td>
                </tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.code}</td>
                    <td>{c.type}</td>
                    <td>
                      {c.type === 'percent'
                        ? `${c.value}%`
                        : c.value != null
                        ? `JMD ${c.value}`
                        : '—'}
                    </td>
                    <td>{c.ambassador_name || '—'}</td>
                    <td>{c.campaign_name || '—'}</td>
                    <td>
                      {c.redemptions != null ? c.redemptions : '0'}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ''}
                    </td>
                    <td>{c.revenue != null ? c.revenue : '—'}</td>
                    <td>
                      {c.active === false
                        ? 'Inactive'
                        : c.ends_at
                        ? `Until ${new Date(c.ends_at).toLocaleDateString()}`
                        : 'Ongoing'}
                    </td>
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

