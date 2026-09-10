// components/EditModeToggle.tsx
// Edit-mode toggle switch + expanding banner
// Shared by multiple in-app editors (e.g. lab, modules reader)

interface EditModeToggleProps {
	editMode: boolean;
	onToggle: () => void;
	/** Optional extra class on the outer wrapper, for page-specific width/position (e.g. matching a narrower content column). */
	className?: string;
}

export default function EditModeToggle({ editMode, onToggle, className = '' }: EditModeToggleProps) {
	return (
		<div className={`edit-mode-toggle-bar ${className}`.trim()}>
			<div className={`edit-mode-bar ${editMode ? 'edit-mode-bar--expanded' : ''}`}>
				<div className="edit-mode-toggle-wrap">
					<button
						type="button"
						role="switch"
						aria-checked={editMode}
						aria-label="Toggle edit mode"
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
							✏️ Edit Mode — make your changes below · save when done
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
