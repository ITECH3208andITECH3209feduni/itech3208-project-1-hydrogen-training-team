// app/lab/components/EditModeToggle.tsx
// Toggle switch shown top-right (under the navbar) for users permitted to edit the lab page.
// Expands into banner when on.

interface EditModeToggleProps {
	editMode: boolean;
	onToggle: () => void;
}

export default function EditModeToggle({ editMode, onToggle }: EditModeToggleProps) {
	return (
		<div className="edit-mode-toggle-bar">
			<div className={`edit-mode-bar ${editMode ? 'edit-mode-bar--expanded' : ''}`}>
				<div className="edit-mode-toggle-wrap">
					<button
						type="button"
						role="switch"
						aria-checked={editMode}
						aria-label="Toggle lab edit mode"
						className={`edit-mode-toggle ${editMode ? 'edit-mode-toggle--on' : ''}`}
						onClick={onToggle}
					>
						<span className="edit-mode-toggle-knob" />
					</button>
					{!editMode && <span className="edit-mode-toggle-label">Edit Mode</span>}
				</div>

				{editMode && (
					<div className="edit-mode-bar-text">
						<span className="edit-banner-title">
							✏️ Edit Mode — drag hotspots to reposition · select one to edit text
						</span>
						<span className="edit-banner-hint">
							Use the switch to exit
						</span>
					</div>
				)}
			</div>
		</div>
	);
}