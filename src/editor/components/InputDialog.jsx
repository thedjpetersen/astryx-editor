import React, {useState} from 'react';

/**
 * Small centered input dialog replacing window.prompt for link and comment
 * entry. Enter submits, Escape cancels; both return focus to the document
 * via the host's onClose.
 */
export function InputDialog({title, placeholder, initialValue = '', submitLabel = 'Save', allowEmpty = false, onSubmit, onClose}) {
  const [value, setValue] = useState(initialValue);
  const canSubmit = allowEmpty || Boolean(value.trim());

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onClose();
    onSubmit(value.trim());
  };

  return (
    <div
      className="palette-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <form
        className="palette input-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            const focusables = event.currentTarget.querySelectorAll('input, button:not(:disabled)');
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}>
        <div className="input-dialog-title">{title}</div>
        <input
          className="palette-input"
          value={value}
          placeholder={placeholder}
          aria-label={title}
          autoFocus
          spellCheck={false}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="input-dialog-actions">
          <button className="panel-action" type="button" onClick={onClose}>Cancel</button>
          <button className="panel-action primary" type="submit" disabled={!canSubmit}>{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
