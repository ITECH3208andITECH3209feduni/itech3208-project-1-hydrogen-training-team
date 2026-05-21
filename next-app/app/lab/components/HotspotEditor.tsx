// app/lab/components/HotspotEditor.tsx
// Two-column edit panel: hotspot list on the left, title/text/position editor on the right

import { EditableHotspot } from '@/hooks/useHazards';
import { HazardInfo } from '@/lib/hazards';
import { labelStyle, inputStyle } from '../styles';

interface HotspotEditorProps {
	hotspots:       EditableHotspot[];
	selected:       number | null;
	onSelect:       (index: number) => void;
	onUpdateInfo:   (index: number, field: keyof HazardInfo, value: string) => void;
	onUpdatePosition: (index: number, field: 'top' | 'left', value: string) => void;
}

export default function HotspotEditor({
	hotspots,
	selected,
	onSelect,
	onUpdateInfo,
	onUpdatePosition,
}: HotspotEditorProps) {
	return (
		<div className="hotspot-editor">
			
			{/* Hotspot list */}
			<div className="panel" style={{ overflow: 'hidden' }}>
				<div className="panel-header">🎯 Hotspots</div>
				<div style={{ padding: '10px' }}>
					{hotspots.map((hs, index) => (
						<button
							key={hs.type}
							onClick={() => onSelect(index)}
							className={`hotspot-list-item ${selected === index ? 'hotspot-list-item--active' : ''}`}
						>
							{hs.info.title.split(' ')[0]} {hs.type.charAt(0).toUpperCase() + hs.type.slice(1)}
							<div className="hotspot-list-item-position">
								top {hs.top} · left {hs.left}
							</div>
						</button>
					))}
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
