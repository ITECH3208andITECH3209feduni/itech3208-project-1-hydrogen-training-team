// app/lab/components/HotspotEditor.tsx
// Two-column edit panel: hotspot list on the left, title/text/position editor on the right

import { EditableHotspot } from '@/hooks/useHazards';
import { HazardInfo } from '@/lib/hazards';
import { labelStyle, inputStyle } from '../styles';

interface HotspotEditorProps {
	hotspots:			EditableHotspot[];
	selected:			number | null;
	onSelect:			(index: number) => void;
	onUpdateInfo:		(index: number, field: keyof HazardInfo, value: string) => void;
	onUpdatePosition:	(index: number, field: 'top' | 'left', value: string) => void;
	onAdd:				() => void;
	onDelete:			(index: number) => void;
}

export default function HotspotEditor({
	hotspots,
	selected,
	onSelect,
	onUpdateInfo,
	onUpdatePosition,
	onAdd,
	onDelete,
}: HotspotEditorProps) {
	return (
		<div className="hotspot-editor">
			
			{/* Hotspot list */}
			<div className="panel" style={{ overflow: 'hidden' }}>
				<div className="panel-header" style={{ justifyContent: 'space-between' }}>
					<span>🎯 Hotspots</span>
					{/* Add Hotspot button */}
					<button
						onClick={onAdd}
						title="Add new hotspot"
						className="hotspot-add-btn"
					>
						+
					</button>
				</div>
				<div style={{ padding: '10px' }}>
					{hotspots.map((hs, index) => (
						<div
							key={hs.type}
							style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
						>
							<button
								onClick={() => onSelect(index)}
								className={`hotspot-list-item ${selected === index ? 'hotspot-list-item--active' : ''}`}
								style={{ marginBottom: 0, flex: 1 }}
							>
								{hs.info.title.split(' ')[0]} {hs.type.charAt(0).toUpperCase() + hs.type.slice(1)}
								<div className="hotspot-list-item-position">
									top {hs.top} · left {hs.left}
								</div>
							</button>
							
							{/* Delete Hotspot button */}
							<button
								onClick={() => onDelete(index)}
								title="Delete hotspot"
								className="hotspot-delete-btn"
							>
								✕
							</button>
						</div>
					))}
					
					{hotspots.length === 0 && (
						<p style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '8px 4px' }}>
							No hotspots. Click + to add one.
						</p>
					)}
				</div>
			</div>
			
			{/* Hotspot editor */}
			<div className="panel" style={{ overflow: 'hidden' }}>
				<div className="panel-header">
					✏️ {selected !== null ? `Editing: ${hotspots[selected].type}` : 'Select a hotspot'}
				</div>
				<div style={{ padding: '20px' }}>
					{selected === null ? (
						<p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
							Click a hotspot on the image or pick one from the list to edit its title and description.
						</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
						
							{/* Type key (read-only) */}
							<div>
								<label style={labelStyle}>Type key</label>
								<input
									style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
									value={hotspots[selected].type}
									readOnly
								/>
								<p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>
									Auto-generated identifier — cannot be changed after creation.
								</p>
							</div>
			  
							{/* Position fields */}
							<div style={{ display: 'flex', gap: '12px' }}>
								{(['top', 'left'] as const).map((field) => (
									<div key={field} style={{ flex: 1 }}>
										<label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)} (%)</label>
										<input
											style={inputStyle}
											value={hotspots[selected][field]}
											onChange={(e) => onUpdatePosition(selected, field, e.target.value)}
										/>
									</div>
								))}
							</div>
							
							{/* Title */}
							<div>
								<label style={labelStyle}>Title</label>
								<input
									style={inputStyle}
									value={hotspots[selected].info.title}
									onChange={(e) => onUpdateInfo(selected, 'title', e.target.value)}
									placeholder="e.g. ⚠️ Gas Leak Detection"
								/>
							</div>
							
							{/* Description */}
							<div>
								<label style={labelStyle}>Description</label>
								<textarea
									style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: '1.5' }}
									value={hotspots[selected].info.text}
									onChange={(e) => onUpdateInfo(selected, 'text', e.target.value)}
								/>
							</div>
							
							<p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
								💡 Drag the hotspot on the image to reposition — values above update automatically.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
