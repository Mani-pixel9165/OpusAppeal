import Button from './Button';

export default function ConfirmationModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  loading,
  confirmLabel = 'Create',
  loadingLabel = 'Creating...',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  showCloseIcon = false,
  hideActions = false,
  modalClassName = '',
  children
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`modal ${modalClassName}`} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        {showCloseIcon ? (
          <button className="modal-close-button" type="button" onClick={onCancel} aria-label="Close modal">
            ×
          </button>
        ) : null}
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        {children}
        {!hideActions ? (
          <div className="modal-actions">
            <Button variant="secondary" type="button" onClick={onCancel}>{cancelLabel}</Button>
            <Button type="button" onClick={onConfirm} disabled={loading || confirmDisabled}>{loading ? loadingLabel : confirmLabel}</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
