/** Small Edit / Delete buttons for one record in a list. Delete always asks first. */
export function RowActions({ onEdit, onDelete, confirmText }: { onEdit?: () => void; onDelete?: () => void; confirmText: string }) {
  return (
    <div className="row-actions">
      {onEdit && (
        <button className="btn btn-secondary btn-mini" onClick={onEdit}>
          Edit
        </button>
      )}
      {onDelete && (
        <button
          className="btn btn-danger btn-mini"
          onClick={() => {
            if (window.confirm(confirmText)) onDelete();
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
}

/** Cancel / Save pair under an inline edit form. */
export function EditButtons({ onCancel, onSave, saveDisabled }: { onCancel: () => void; onSave: () => void; saveDisabled?: boolean }) {
  return (
    <div className="fieldrow" style={{ marginTop: 8 }}>
      <button className="btn btn-secondary btn-small" onClick={onCancel}>
        Cancel
      </button>
      <button className="btn btn-primary btn-small" onClick={onSave} disabled={saveDisabled}>
        Save
      </button>
    </div>
  );
}
