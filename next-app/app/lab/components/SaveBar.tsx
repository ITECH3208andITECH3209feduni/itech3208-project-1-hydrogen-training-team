// app/lab/components/SaveBar.tsx
// Reset and save buttons shown at the bottom of the page in edit mode

import { SaveStatus } from '@/hooks/useHazards';
import { primaryBtnStyle, secondaryBtnStyle } from '../styles';

interface SaveBarProps {
	saveStatus: SaveStatus;
	// These will be passed "resetDefaults" and "saveToSupabase" respectively as props from page.tsx
	onReset: () => void;
	onSave: () => void;
}

export default function SaveBar({ saveStatus, onReset, onSave }: SaveBarProps) {
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
		<div className="save-bar">
			<button onClick={onReset} style={secondaryBtnStyle}>
				🔄 Reset to Defaults
			</button>
			<button
				onClick={onSave}
				disabled={saveStatus === 'saving'}
				style={{ ...primaryBtnStyle,
					opacity: saveStatus === 'saving' ? 0.7 : 1,
					background: saveBg
				}}
			>
				{saveLabel}
			</button>
		</div>
	);
}
