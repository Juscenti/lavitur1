import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function Status({ loading, error }) {
  if (loading) return <p>Loading settings…</p>;
  if (error) return <p className="error">{error}</p>;
  return null;
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .get('/admin/settings')
      .then((data) => {
        if (cancelled) return;
        setSettings(data || {});
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (section, key, value) => {
    setSettings((prev) => ({
      ...(prev || {}),
      [section]: {
        ...(prev?.[section] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    if (!settings) return;
    setSaving(true);
    setSaveMessage('');
    setError('');

    api
      .put
      // Using api.patch would also be fine; the backend decides how to merge.
      // eslint-disable-next-line prefer-template
      ?('/admin/settings', settings)
      : api.patch('/admin/settings', settings);
  };

  // The above conditional is intentionally awkward; simplify by always using patch:
  const save = () => {
    if (!settings) return;
    setSaving(true);
    setSaveMessage('');
    setError('');

    api
      .patch('/admin/settings', settings)
      .then(() => {
        setSaveMessage('Settings saved.');
      })
      .catch((err) => {
        setError(err?.message || 'Failed to save settings.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Settings</h1>
          <p className="panel-subtitle">Global configuration for the storefront and admin tools.</p>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </header>

      <Status loading={loading} error={error} />
      {saveMessage && <p className="success">{saveMessage}</p>}

      {!loading && settings && (
        <div className="panel-columns">
          <section className="panel-section">
            <h2>General</h2>
            <label>
              Store name
              <input
                type="text"
                value={settings.general?.name || ''}
                onChange={(e) => handleChange('general', 'name', e.target.value)}
              />
            </label>
            <label>
              Support email
              <input
                type="email"
                value={settings.general?.supportEmail || ''}
                onChange={(e) => handleChange('general', 'supportEmail', e.target.value)}
              />
            </label>
            <label>
              Support phone
              <input
                type="tel"
                value={settings.general?.supportPhone || ''}
                onChange={(e) => handleChange('general', 'supportPhone', e.target.value)}
              />
            </label>
          </section>

          <section className="panel-section">
            <h2>Checkout & payments</h2>
            <label>
              Minimum order total (JMD)
              <input
                type="number"
                value={settings.checkout?.minOrderTotal ?? ''}
                onChange={(e) =>
                  handleChange('checkout', 'minOrderTotal', Number(e.target.value) || 0)
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!settings.checkout?.codEnabled}
                onChange={(e) => handleChange('checkout', 'codEnabled', e.target.checked)}
              />
              <span>Enable cash on delivery</span>
            </label>
          </section>

          <section className="panel-section">
            <h2>Loyalty defaults</h2>
            <label>
              Points per JMD
              <input
                type="number"
                value={settings.loyalty?.earnRatePerDollar ?? ''}
                onChange={(e) =>
                  handleChange(
                    'loyalty',
                    'earnRatePerDollar',
                    Number(e.target.value) || 0,
                  )
                }
              />
            </label>
          </section>
        </div>
      )}
    </section>
  );
}

