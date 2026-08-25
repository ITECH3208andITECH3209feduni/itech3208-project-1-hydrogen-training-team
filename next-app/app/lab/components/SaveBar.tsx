// app/lab/components/SaveBar.tsx
// Reset and save buttons shown at the bottom of the page in edit mode

import { SaveStatus } from '@/hooks/useHazards';
import { primaryBtnStyle, secondaryBtnStyle } from '../styles';

interface SaveBarProps {
	saveStatus: SaveStatus;
	// These will be passed "resetDefaults" and "saveToSupabase" respectively as props from page.tsx
	onReset: () => void;
	onSave: () => void;
	// check to make sure hotspot has a valid module link or not (if invalid, disable save bar)
	disabled?: boolean;
	// Shown above the buttons whenever disabled is true.
	disabledReason?: string;
}

export default function SaveBar({ saveStatus, onReset, onSave, disabled, disabledReason }: SaveBarProps) {
	const isSaveDisabled = saveStatus === 'saving' || disabled;
	
	const saveLabel =
		saveStatus === 'saving' ? '⏳ Saving…'
		: saveStatus === 'saved'  ? '✅ Saved to database!'
		: saveStatus === 'error'  ? '❌ Save failed — check console'
		: '💾 Save Changes';
	
	const saveBg =
		saveStatus === 'saved'  ? 'linear-gradient(135deg, #059669, #10b981)'
		: saveStatus === 'error' ? 'linear-gradient(135deg, #b91c1c, #ef4444)'
		: primaryBtnStyle.background;
	
	return (
		<>
			{disabled && disabledReason && (
				<p className="save-bar-warning">⚠️ {disabledReason}</p>
			)}
			<div className="save-bar">
				<button onClick={onReset} style={secondaryBtnStyle}>
					🔄 Reset to Defaults
				</button>
				<button
					onClick={onSave}
					disabled={isSaveDisabled}
					title={disabled ? disabledReason : undefined}
					style={{ ...primaryBtnStyle,
						opacity: isSaveDisabled ? 0.6 : 1,
						cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
						background: saveBg
					}}
				>
					{saveLabel}
				</button>
			</div>
		</>
	);
}
