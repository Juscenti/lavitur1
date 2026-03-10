import { useEffect, useState } from 'react';
import api from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading content…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Content() {
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (search) params.set('search', search.trim());

    api
      .get(`/admin/content-blocks?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setItems(data?.items || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load content.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, search]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Content Management</h1>
          <p className="panel-subtitle">
            Hero banners, homepage sections, FAQs and other reusable content blocks.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            // Placeholder – in the future open a create/edit modal.
            // For now, this keeps the skeleton focused on data display.
            // eslint-disable-next-line no-alert
            alert('New content block flow coming soon.');
          }}
        >
          + New block
        </button>
      </header>

      <div className="panel-filters">
        <label>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="hero">Hero</option>
            <option value="homepage_section">Homepage section</option>
            <option value="banner">Banner</option>
            <option value="faq">FAQ</option>
            <option value="guide">Guide</option>
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            placeholder="Title or slug…"
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
                <th>Type</th>
                <th>Slug</th>
                <th>Title</th>
                <th>Active</th>
                <th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>
                    No content blocks found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.type}</td>
                    <td>{item.slug}</td>
                    <td>{item.title}</td>
                    <td>{item.is_active ? 'Yes' : 'No'}</td>
                    <td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</td>
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

