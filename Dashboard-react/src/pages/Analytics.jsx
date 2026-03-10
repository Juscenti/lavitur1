import { useEffect, useState } from 'react';
import api from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading analytics…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Analytics() {
  const [from] = useState('');
  const [to] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    api
      .get(`/admin/analytics/overview?${params.toString()}`)
      .then((d) => {
        if (cancelled) return;
        setData(d || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load analytics.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // date range wires in later
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = data?.kpis || {};
  const daily = data?.daily || [];
  const topProducts = data?.topProducts || [];
  const topAmbassadors = data?.topAmbassadors || [];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Analytics</h1>
          <p className="panel-subtitle">
            Revenue, orders and ambassador performance for your ecommerce business.
          </p>
        </div>
      </header>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <>
          <div className="cards-grid">
            <article className="card">
              <h2>Revenue</h2>
              <p>{kpis.revenue != null ? `JMD ${kpis.revenue.toLocaleString()}` : '—'}</p>
            </article>
            <article className="card">
              <h2>Orders</h2>
              <p>{kpis.orders != null ? kpis.orders : '—'}</p>
            </article>
            <article className="card">
              <h2>Avg. Order Value</h2>
              <p>{kpis.aov != null ? `JMD ${kpis.aov.toLocaleString()}` : '—'}</p>
            </article>
            <article className="card">
              <h2>Ambassador Revenue</h2>
              <p>
                {kpis.ambassador_revenue != null
                  ? `JMD ${kpis.ambassador_revenue.toLocaleString()}`
                  : '—'}
              </p>
            </article>
          </div>

          <div className="panel-columns">
            <section className="panel-section">
              <h2>Daily performance</h2>
              <p className="panel-subtitle">
                Compact view of orders and revenue by day. You can wire this into a chart later.
              </p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Orders</th>
                      <th>Revenue (JMD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                          No data yet.
                        </td>
                      </tr>
                    ) : (
                      daily.map((row) => (
                        <tr key={row.day}>
                          <td>{new Date(row.day).toLocaleDateString()}</td>
                          <td>{row.orders}</td>
                          <td>{row.revenue}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel-section">
              <h2>Top products</h2>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units sold</th>
                      <th>Revenue (JMD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                          No products yet.
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((p) => (
                        <tr key={p.product_id}>
                          <td>{p.name}</td>
                          <td>{p.units_sold}</td>
                          <td>{p.revenue}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h2 style={{ marginTop: '2rem' }}>Top ambassadors</h2>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ambassador</th>
                      <th>Orders</th>
                      <th>Revenue (JMD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAmbassadors.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                          No ambassador activity yet.
                        </td>
                      </tr>
                    ) : (
                      topAmbassadors.map((a) => (
                        <tr key={a.ambassador_profile_id}>
                          <td>{a.name || a.ambassador_name || 'Unnamed'}</td>
                          <td>{a.orders || a.orders_count}</td>
                          <td>{a.gross_revenue}</td>
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

