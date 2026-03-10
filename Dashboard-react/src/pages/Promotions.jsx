import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function formatCurrency(n, currency = 'JMD') {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(0)}`;
  }
}

function formatNumber(n) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat().format(v);
}

function Status({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="promotions-loading">
        <div className="promotions-loading-spinner" aria-hidden />
        <p>Loading promotions…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}

/** If the date is at midnight (00:00:00), treat as end of that day so "end date" means valid through end of day. */
function getValidityEndMoment(isoOrDate) {
  if (!isoOrDate) return null;
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return null;
  const isMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (!isMidnight) return d;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function ValidityBadge({ code }) {
  if (code.active === false) {
    return <span className="promotions-badge promotions-badge--inactive">Inactive</span>;
  }
  if (code.ends_at) {
    const endMoment = getValidityEndMoment(code.ends_at);
    const now = new Date();
    if (endMoment && now > endMoment) {
      return <span className="promotions-badge promotions-badge--ended">Ended</span>;
    }
    const displayEnd = endMoment || new Date(code.ends_at);
    return (
      <span className="promotions-badge promotions-badge--ongoing" title={displayEnd.toLocaleString()}>
        Until {displayEnd.toLocaleDateString()}
      </span>
    );
  }
  if (code.starts_at) {
    const start = new Date(code.starts_at);
    const now = new Date();
    if (now < start) {
      return (
        <span className="promotions-badge promotions-badge--inactive" title={start.toLocaleString()}>
          From {start.toLocaleDateString()}
        </span>
      );
    }
  }
  return <span className="promotions-badge promotions-badge--active">Ongoing</span>;
}

function NewDiscountModal({ onClose, onCreated }) {
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [active, setActive] = useState(true);
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ambassadorsWithoutCode, setAmbassadorsWithoutCode] = useState([]);
  const [ambassadorsLoading, setAmbassadorsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAmbassadorsLoading(true);
    api
      .get('/admin/promotions/ambassadors-without-code')
      .then((data) => {
        if (!cancelled) setAmbassadorsWithoutCode(data?.ambassadors || []);
      })
      .catch(() => {
        if (!cancelled) setAmbassadorsWithoutCode([]);
      })
      .finally(() => {
        if (!cancelled) setAmbassadorsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const percent = discountPercent === '' ? null : Number(discountPercent);
    if (!code.trim()) {
      setError('Discount code is required.');
      return;
    }
    if (percent == null || Number.isNaN(percent) || percent < 0 || percent > 100) {
      setError('Discount percentage must be between 0 and 100.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/discounts', {
        code: code.trim().toUpperCase(),
        discount_percent: percent,
        active,
        usage_limit: usageLimit.trim() ? Number(usageLimit) : null,
        starts_at: startsAt.trim() || null,
        ends_at: endsAt.trim() || null,
        ambassador_id: selectedAmbassadorId.trim() || null,
        ambassador_profile_id: selectedAmbassadorId.trim() || null,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create discount.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="promotions-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-discount-title">
      <div className="promotions-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="promotions-modal">
        <header className="promotions-modal-header">
          <div className="promotions-modal-header-text">
            <h2 id="new-discount-title" className="promotions-modal-title">Create discount code</h2>
            <p className="promotions-modal-desc">
              Define a new promotion code. Optionally assign it to an ambassador who does not yet have a code.
            </p>
          </div>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="promotions-modal-body">
            <section className="promotions-modal-section" aria-labelledby="promo-section-details">
              <h3 id="promo-section-details" className="promotions-modal-section-title">Discount details</h3>
              <div className="form-row">
                <label htmlFor="promo-code">Code<span className="required">*</span></label>
                <input
                  id="promo-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  autoComplete="off"
                  maxLength={32}
                />
                <p className="form-hint">Customers enter at checkout. Letters and numbers only.</p>
              </div>
              <div className="form-row">
                <label htmlFor="promo-percent">Discount %<span className="required">*</span></label>
                <input
                  id="promo-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="15"
                />
                <p className="form-hint">0–100% off.</p>
              </div>
              <div className="form-row">
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  <span>Active immediately</span>
                </label>
              </div>
            </section>

            <section className="promotions-modal-section" aria-labelledby="promo-section-validity">
              <h3 id="promo-section-validity" className="promotions-modal-section-title">Validity & limits</h3>
              <div className="form-row">
                <label htmlFor="promo-usage">Usage limit</label>
                <input
                  id="promo-usage"
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                />
                <p className="form-hint">Max redemptions. Empty = unlimited.</p>
              </div>
              <div className="form-row">
                <label htmlFor="promo-starts">Start</label>
                <input
                  id="promo-starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="promo-ends">End</label>
                <input
                  id="promo-ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
                <p className="form-hint">Optional. After this time code stops working.</p>
              </div>
            </section>

            <section className="promotions-modal-section" aria-labelledby="promo-section-ambassador">
              <h3 id="promo-section-ambassador" className="promotions-modal-section-title">Ambassador</h3>
              <div className="form-row">
                <label htmlFor="promo-ambassador">Assign to</label>
                {ambassadorsLoading ? (
                  <p className="ambassador-loading">Loading…</p>
                ) : (
                  <>
                    <select
                      id="promo-ambassador"
                      value={selectedAmbassadorId}
                      onChange={(e) => setSelectedAmbassadorId(e.target.value)}
                      aria-describedby="promo-ambassador-hint"
                    >
                      <option value="">No ambassador</option>
                      {ambassadorsWithoutCode.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name || 'Unnamed'} {a.email ? `(${a.email})` : ''}
                        </option>
                      ))}
                    </select>
                    <p id="promo-ambassador-hint" className="form-hint">
                      {ambassadorsWithoutCode.length === 0
                        ? 'All have a code already.'
                        : 'Only those without a code are listed.'}
                    </p>
                  </>
                )}
              </div>
            </section>

            {error && <p className="error-inline">{error}</p>}
          </div>
          <div className="promotions-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Format ISO/date for datetime-local input (use local time so values don’t “move” in the UI). */
function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function EditDiscountModal({ initialCode, onClose, onUpdated }) {
  const [code, setCode] = useState(initialCode?.code ?? '');
  const [discountPercent, setDiscountPercent] = useState(initialCode?.value != null ? String(initialCode.value) : '');
  const [usageLimit, setUsageLimit] = useState(initialCode?.usage_limit != null ? String(initialCode.usage_limit) : '');
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initialCode?.starts_at));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initialCode?.ends_at));
  const [active, setActive] = useState(initialCode?.active !== false);
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState(initialCode?.ambassador_id ?? '');
  const [campaignName, setCampaignName] = useState(initialCode?.campaign_name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ambassadorsWithoutCode, setAmbassadorsWithoutCode] = useState([]);
  const [ambassadorsLoading, setAmbassadorsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAmbassadorsLoading(true);
    const params = initialCode?.id ? `?exclude_code_id=${initialCode.id}` : '';
    api
      .get(`/admin/promotions/ambassadors-without-code${params}`)
      .then((data) => {
        if (!cancelled) setAmbassadorsWithoutCode(data?.ambassadors || []);
      })
      .catch(() => {
        if (!cancelled) setAmbassadorsWithoutCode([]);
      })
      .finally(() => {
        if (!cancelled) setAmbassadorsLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialCode?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const percent = discountPercent === '' ? null : Number(discountPercent);
    if (!code.trim()) {
      setError('Discount code is required.');
      return;
    }
    if (percent != null && (Number.isNaN(percent) || percent < 0 || percent > 100)) {
      setError('Discount percentage must be between 0 and 100.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/admin/discounts/${initialCode.id}`, {
        code: code.trim().toUpperCase(),
        discount_percent: percent,
        active,
        usage_limit: usageLimit.trim() ? Number(usageLimit) : null,
        starts_at: startsAt.trim() || null,
        ends_at: endsAt.trim() || null,
        ambassador_id: selectedAmbassadorId.trim() || null,
        ambassador_profile_id: selectedAmbassadorId.trim() || null,
        campaign_name: campaignName.trim() || null,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update discount.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="promotions-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-discount-title">
      <div className="promotions-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="promotions-modal">
        <header className="promotions-modal-header">
          <div className="promotions-modal-header-text">
            <h2 id="edit-discount-title" className="promotions-modal-title">Edit discount code</h2>
            <p className="promotions-modal-desc">
              Update code, percentage, dates, or assign a different ambassador. Turn Active on to reactivate.
            </p>
          </div>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="promotions-modal-body">
            <section className="promotions-modal-section" aria-labelledby="edit-section-details">
              <h3 id="edit-section-details" className="promotions-modal-section-title">Discount details</h3>
              <div className="form-row">
                <label htmlFor="edit-promo-code">Code<span className="required">*</span></label>
                <input
                  id="edit-promo-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  autoComplete="off"
                  maxLength={32}
                />
              </div>
              <div className="form-row">
                <label htmlFor="edit-promo-percent">Discount %<span className="required">*</span></label>
                <input
                  id="edit-promo-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="15"
                />
              </div>
              <div className="form-row">
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  <span>Active (turn off to disable this code)</span>
                </label>
              </div>
              <div className="form-row">
                <label htmlFor="edit-promo-campaign">Campaign name</label>
                <input
                  id="edit-promo-campaign"
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </section>

            <section className="promotions-modal-section" aria-labelledby="edit-section-validity">
              <h3 id="edit-section-validity" className="promotions-modal-section-title">Validity & limits</h3>
              <div className="form-row">
                <label htmlFor="edit-promo-usage">Usage limit</label>
                <input
                  id="edit-promo-usage"
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div className="form-row">
                <label htmlFor="edit-promo-starts">Start</label>
                <input
                  id="edit-promo-starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="edit-promo-ends">End</label>
                <input
                  id="edit-promo-ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </section>

            <section className="promotions-modal-section" aria-labelledby="edit-section-ambassador">
              <h3 id="edit-section-ambassador" className="promotions-modal-section-title">Ambassador</h3>
              <div className="form-row">
                <label htmlFor="edit-promo-ambassador">Assign to</label>
                {ambassadorsLoading ? (
                  <p className="ambassador-loading">Loading…</p>
                ) : (
                  <>
                    <select
                      id="edit-promo-ambassador"
                      value={selectedAmbassadorId}
                      onChange={(e) => setSelectedAmbassadorId(e.target.value)}
                    >
                      <option value="">No ambassador</option>
                      {ambassadorsWithoutCode.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name || 'Unnamed'} {a.email ? `(${a.email})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">Current ambassador is included so you can keep or change.</p>
                  </>
                )}
              </div>
            </section>

            {error && <p className="error-inline">{error}</p>}
          </div>
          <div className="promotions-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Promotions() {
  const [codes, setCodes] = useState([]);
  const [onlyActive, setOnlyActive] = useState(true);
  const [ambassadorOnly, setAmbassadorOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchCodes = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (onlyActive) params.set('active', 'true');
    if (ambassadorOnly) params.set('ambassador_only', 'true');
    api
      .get(`/admin/promotions/discount-codes?${params.toString()}`)
      .then((data) => setCodes(data?.codes || []))
      .catch((err) => setError(err?.message || 'Failed to load discount codes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCodes();
  }, [onlyActive, ambassadorOnly]);

  const copyCode = (id, code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleToggleActive = async (id, currentActive) => {
    const next = !currentActive;
    try {
      await api.patch(`/admin/discounts/${id}/active`, { active: next });
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active: next } : c))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const totalRedemptions = codes.reduce((s, c) => s + Number(c.redemptions ?? 0), 0);
  const totalDiscountApplied = codes.reduce((s, c) => s + Number(c.revenue ?? 0), 0);
  const activeCount = codes.filter((c) => c.active !== false).length;

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Promotions</h1>
          <p className="panel-subtitle">
            Manage discount codes, campaigns, and ambassador attribution. Create codes and toggle them on or off.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowNewModal(true)}
        >
          + New discount
        </button>
      </header>

      <Status loading={loading} error={error} onRetry={fetchCodes} />

      {!loading && !error && (
        <>
          <div className="promotions-toolbar">
            <div className="promotions-filters">
              <label>
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                />
                <span>Show only active</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={ambassadorOnly}
                  onChange={(e) => setAmbassadorOnly(e.target.checked)}
                />
                <span>Ambassador codes only</span>
              </label>
            </div>
          </div>

          <div className="promotions-kpi-grid">
            <article className="promotions-kpi-card">
              <p className="kpi-label">Active codes</p>
              <p className="kpi-value">{formatNumber(activeCount)}</p>
            </article>
            <article className="promotions-kpi-card">
              <p className="kpi-label">Total redemptions</p>
              <p className="kpi-value">{formatNumber(totalRedemptions)}</p>
            </article>
            <article className="promotions-kpi-card">
              <p className="kpi-label">Discount applied (JMD)</p>
              <p className="kpi-value">{formatCurrency(totalDiscountApplied)}</p>
            </article>
          </div>

          <div className="promotions-table-card">
            {codes.length === 0 ? (
              <div className="promotions-empty">
                No discount codes found. Create one to get started.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="promotions-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Ambassador</th>
                      <th>Campaign</th>
                      <th>Usage</th>
                      <th>Discount applied</th>
                      <th>Valid</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => {
                      const used = Number(c.redemptions ?? c.used_count ?? 0);
                      const limit = c.usage_limit ? Number(c.usage_limit) : null;
                      const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="code-cell-wrap">
                              <span className="code-cell">{c.code}</span>
                              <button
                                type="button"
                                className={`promotions-code-copy ${copiedId === c.id ? 'copied' : ''}`}
                                onClick={() => copyCode(c.id, c.code)}
                                title="Copy code"
                              >
                                {copiedId === c.id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </td>
                          <td>{c.type || 'percent'}</td>
                          <td>
                            {c.type === 'percent'
                              ? `${c.value ?? '—'}%`
                              : c.value != null
                                ? formatCurrency(c.value)
                                : '—'}
                          </td>
                          <td>{c.ambassador_name || (c.ambassador_id ? String(c.ambassador_id).slice(0, 8) + '…' : '—')}</td>
                          <td>{c.campaign_name || '—'}</td>
                          <td>
                            {limit ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {formatNumber(used)} / {formatNumber(limit)}
                                </span>
                                <div className="promotions-usage-bar">
                                  <div
                                    className={`promotions-usage-bar-fill ${pct >= 100 ? 'promotions-usage-bar-fill--full' : ''}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              formatNumber(used)
                            )}
                          </td>
                          <td>{c.revenue != null ? formatCurrency(c.revenue) : '—'}</td>
                          <td>
                            <ValidityBadge code={c} />
                          </td>
                          <td>
                            <div className="promotions-actions-cell">
                              <button
                                type="button"
                                className={`promotions-toggle-active promotions-toggle-active--${c.active !== false ? 'on' : 'off'}`}
                                onClick={() => handleToggleActive(c.id, c.active !== false)}
                                title={c.active !== false ? 'Turn off' : 'Reactivate'}
                              >
                                {c.active !== false ? 'On' : 'Off'}
                              </button>
                              <button
                                type="button"
                                className="promotions-edit-btn"
                                onClick={() => setEditingCode(c)}
                                title="Edit code"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showNewModal && (
        <NewDiscountModal
          onClose={() => setShowNewModal(false)}
          onCreated={fetchCodes}
        />
      )}
      {editingCode && (
        <EditDiscountModal
          initialCode={editingCode}
          onClose={() => setEditingCode(null)}
          onUpdated={fetchCodes}
        />
      )}
    </section>
  );
}
