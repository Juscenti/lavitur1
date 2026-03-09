import { useState, useEffect } from 'react';

const CONFIRM_WORD = 'DELETE';

export default function ConfirmDeleteModal({ open, onClose, onConfirm, title, bodyLabel, deleting, confirmPayload }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const isBusy = busy || deleting;

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  if (!open) return null;

  const canConfirm = String(typed).trim().toUpperCase() === CONFIRM_WORD && !isBusy;

  const handleConfirm = async () => {
    // #region agent log
    console.log('[DEBUG modal] handleConfirm called', {canConfirm, isBusy, typed: typed.trim(), confirmPayload});
    // #endregion
    if (!canConfirm) return;
    setBusy(true);
    try {
      // #region agent log
      console.log('[DEBUG modal] calling onConfirm with payload:', confirmPayload);
      // #endregion
      const result = onConfirm(confirmPayload);
      // #region agent log
      console.log('[DEBUG modal] onConfirm returned, isPromise:', result && typeof result.then === 'function');
      // #endregion
      if (result && typeof result.then === 'function') {
        try {
          await result;
          // #region agent log
          console.log('[DEBUG modal] promise resolved OK');
          // #endregion
          onClose();
        } catch (promiseErr) {
          // #region agent log
          console.error('[DEBUG modal] promise REJECTED', promiseErr?.message, promiseErr?.status, promiseErr?.data, promiseErr?.responseText);
          // #endregion
          throw promiseErr;
        }
      } else {
        onClose();
      }
    } catch (outerErr) {
      // #region agent log
      console.error('[DEBUG modal] outer catch', outerErr?.message, outerErr?.status, outerErr?.data, outerErr?.responseText);
      // #endregion
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="confirm-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
      <div className="confirm-delete-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="confirm-delete-modal">
        <h2 id="confirm-delete-title" className="confirm-delete-title">{title}</h2>
        <p className="confirm-delete-body">
          This action cannot be undone. Type <strong>{CONFIRM_WORD}</strong> below to confirm.
        </p>
        <input
          type="text"
          className="confirm-delete-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          aria-label={`Type ${CONFIRM_WORD} to confirm`}
        />
        <div className="confirm-delete-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isBusy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
