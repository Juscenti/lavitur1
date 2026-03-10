import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading roles…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Roles() {
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([api.get('/admin/roles/users'), api.get('/admin/roles/matrix')])
      .then(([u, m]) => {
        if (cancelled) return;
        setUsers(u?.users || []);
        setMatrix(m || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load roles and permissions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const roles = matrix?.roles || [];
  const resources = matrix?.resources || [];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Roles & Permissions</h1>
          <p className="panel-subtitle">
            See which staff and ambassadors exist in the system, and how much access each role has.
          </p>
        </div>
      </header>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <>
          <section className="panel-section">
            <h2>Staff & ambassadors</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Locked</th>
                    <th>MFA</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>
                        No staff or ambassadors found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.full_name || '—'}</td>
                        <td>{u.email || '—'}</td>
                        <td>{u.role || '—'}</td>
                        <td>{u.is_locked ? 'Yes' : 'No'}</td>
                        <td>{u.mfa_enabled ? 'Enabled' : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel-section" style={{ marginTop: '2rem' }}>
            <h2>Role matrix</h2>
            <p className="panel-subtitle">
              Read/write/admin capabilities per role and resource. The first pass is read-only; later you
              can wire inline editing.
            </p>
            <div className="table-wrapper">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Resource</th>
                    {roles.map((r) => (
                      <th key={r.role_key}>{r.display_name || r.role_key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={1 + roles.length} style={{ textAlign: 'center' }}>
                        No permissions defined yet.
                      </td>
                    </tr>
                  ) : (
                    resources.map((res) => (
                      <tr key={res.resource}>
                        <td>{res.resource}</td>
                        {roles.map((r) => {
                          const perm = res.permissions?.[r.role_key] || {};
                          const parts = [];
                          if (perm.read) parts.push('R');
                          if (perm.write) parts.push('W');
                          if (perm.admin) parts.push('A');
                          return <td key={r.role_key}>{parts.join('') || '—'}</td>;
                        })}
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

