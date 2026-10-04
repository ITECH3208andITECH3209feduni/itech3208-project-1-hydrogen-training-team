// components/SaveBar.tsx
// Save/reset buttons for editor pages (Save sends current state to Supabase, Reset reverts to fallback defaults)
// Shared by multiple in-app editors (e.g. lab, modules reader)

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveBarProps {
	saveStatus: SaveStatus;
	onReset: () => void;
	onSave: () => void;
	resetDisabled?: boolean;
	resetDisabledReason?: string;
	saveDisabled?: boolean;
	saveDisabledReason?: string;
}

export default function SaveBar({
	saveStatus,
	onReset,
	onSave,
	resetDisabled,
	resetDisabledReason,
	saveDisabled,
	saveDisabledReason,
}: SaveBarProps) {
	const isSaveDisabled = saveStatus === 'saving' || saveDisabled;

	const saveLabel = saveStatus === 'saving' ? '⏳ Saving…'
		: saveStatus === 'saved'  ? '✅ Saved to database!'
		: saveStatus === 'error'  ? '❌ Save failed — check console'
		: '💾 Save Changes';

	// Only one expected to be active at a time — reason matches whichever button is currently disabled.
	const activeWarning = saveDisabled && saveDisabledReason
		? saveDisabledReason
		: resetDisabled && resetDisabledReason
			? resetDisabledReason
			: null;

	return (
		<>
			{activeWarning && <p className="save-bar-warning">⚠️ {activeWarning}</p>}
			<div className="save-bar">
				<button
					onClick={onReset}
					disabled={resetDisabled}
					title={resetDisabled ? resetDisabledReason : undefined}
					className="editor-btn-secondary"
					style={{
						opacity: resetDisabled ? 0.5 : 1,
						cursor: resetDisabled ? 'not-allowed' : 'pointer',
					}}
				>
					🔄 Reset to Defaults
				</button>
				<button
					onClick={onSave}
					disabled={isSaveDisabled}
					title={saveDisabled ? saveDisabledReason : undefined}
					className={`editor-btn-primary ${
						saveStatus === 'saved' ? 'editor-btn-primary--saved'
						: saveStatus === 'error' ? 'editor-btn-primary--error'
						: ''
					}`.trim()}
					style={{
						opacity: isSaveDisabled ? 0.6 : 1,
						cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
					}}
				>
					{saveLabel}
				</button>
			</div>
		</>
	);
}
