import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading database tools…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function DbTools() {
  const [health, setHealth] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState(false);

  const load = () => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([api.get('/admin/database/health'), api.get('/admin/database/jobs')])
      .then(([h, j]) => {
        if (cancelled) return;
        setHealth(h || null);
        setJobs(j?.jobs || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load database info.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = load();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerJob = (jobKey) => {
    setTriggering(true);
    api
      .post('/admin/database/jobs', { job_key: jobKey })
      .then(() => {
        load();
      })
      .catch((err) => {
        // eslint-disable-next-line no-alert
        alert(err?.message || 'Failed to trigger job.');
      })
      .finally(() => {
        setTriggering(false);
      });
  };

  const tableStats = health?.tables || health?.db_table_stats || [];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Database Tools</h1>
          <p className="panel-subtitle">
            Lightweight overview of table sizes and background maintenance jobs.
          </p>
        </div>
      </header>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <>
          <section className="panel-section">
            <h2>Table row estimates</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Estimated rows</th>
                  </tr>
                </thead>
                <tbody>
                  {tableStats.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center' }}>
                        No stats available.
                      </td>
                    </tr>
                  ) : (
                    tableStats.map((t) => (
                      <tr key={t.table_name}>
                        <td>{t.table_name}</td>
                        <td>{t.estimated_rows}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel-section" style={{ marginTop: '2rem' }}>
            <h2>Maintenance jobs</h2>
            <div className="panel-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={triggering}
                onClick={() => triggerJob('recompute_dashboard_metrics')}
              >
                Recompute dashboard metrics
              </button>
            </div>

            <div className="table-wrapper" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Finished</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center' }}>
                        No jobs yet.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr key={j.id}>
                        <td>{j.created_at ? new Date(j.created_at).toLocaleString() : '—'}</td>
                        <td>{j.job_key}</td>
                        <td>{j.status}</td>
                        <td>{j.started_at ? new Date(j.started_at).toLocaleString() : '—'}</td>
                        <td>{j.finished_at ? new Date(j.finished_at).toLocaleString() : '—'}</td>
                        <td>{j.message || '—'}</td>
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

