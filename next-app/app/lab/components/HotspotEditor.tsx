// app/lab/components/HotspotEditor.tsx
// Image upload section, followed by two-column edit panel: hotspot list on the left, title/text/position/video editor on the right

import { useRef } from 'react';
import { EditableHotspot, UploadStatus } from '@/hooks/lab/useHotspots';
import { ModuleTopicOptions } from '@/hooks/lab/useModuleOptions';
import { HazardInfo } from '@/lib/hazards';
import { labelStyle, inputStyle } from '@/components/editorStyles';
import VideoEditorPanel from '@/components/VideoEditorPanel';

interface HotspotEditorProps {
	hotspots:           EditableHotspot[];
	selected:           number | null;
	uploadStatus:       UploadStatus;
	moduleOptions:      ModuleTopicOptions[];
	onSelect:           (index: number) => void;
	onUpdateInfo:       (index: number, field: keyof HazardInfo, value: string | null) => void;
	onUpdatePosition:   (index: number, field: 'top' | 'left', value: string) => void;
	onUpdateModuleLink: (index: number, moduleTopic: string | null, moduleId: string | null) => void;
	onAdd:              () => void;
	onDelete:           (index: number) => void;
	onUploadImage:      (file: File) => void;

	// Video controls for the currently-select hotspot
	videoType:          'youtube' | 'mp4';
	youtubeUrl:         string;
	selectedVideoFile:  File | null;
	videoSaving:        boolean;
	onChangeVideoType:  (type: 'youtube' | 'mp4') => void;
	onChangeYoutubeUrl: (url: string) => void;
	onSelectVideoFile:  (file: File | null) => void;
	onSaveYoutubeVideo: () => void;
	onUploadMp4Video:   () => void;
	onRemoveVideo:      () => void;
}

export default function HotspotEditor({
	hotspots,
	selected,
	uploadStatus,
	moduleOptions,
	onSelect,
	onUpdateInfo,
	onUpdatePosition,
	onUpdateModuleLink,
	onAdd,
	onDelete,
	onUploadImage,
	videoType,
	youtubeUrl,
	selectedVideoFile,
	videoSaving,
	onChangeVideoType,
	onChangeYoutubeUrl,
	onSelectVideoFile,
	onSaveYoutubeVideo,
	onUploadMp4Video,
	onRemoveVideo,
}: HotspotEditorProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) onUploadImage(file);
		// Reset input so the same file can be re-selected if needed
		e.target.value = '';
	};
	
	const uploadLabel =
		uploadStatus === 'uploading' ? '⏳ Uploading…'
		: uploadStatus === 'uploaded' ? '✅ Image updated!'
		: uploadStatus === 'error'    ? '❌ Upload failed'
		: '🖼️ Change Lab Image';
	
	return (
		<div className="editor-wrap">
			
			{/* ── Image upload ─────────────────────────────────────────────────── */}
			<div className="panel panel--clip">
				<div className="panel-header">🖼️ Lab Image</div>
				<div className="image-upload-panel">
					<p className="image-upload-description">
						Replace the lab image shown behind the hotspots. The new image is stored in Supabase and loads on every visit.
					</p>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="file-input-hidden"
						onChange={handleFileChange}
					/>
					<button
						onClick={() => fileInputRef.current?.click()}
						disabled={uploadStatus === 'uploading'}
						className={`image-upload-btn image-upload-btn--${uploadStatus}`}
					>
						{uploadLabel}
					</button>
				</div>
			</div>
			
			{/* ── Hotspot editor ───────────────────────────────────────────────── */}
			<div className="hotspot-editor">
				
				{/* Hotspot list */}
				<div className="panel panel--clip">
					<div className="panel-header panel-header--spread">
						<span>🎯 Hotspots</span>
						{/* Add Hotspot button */}
						<button onClick={onAdd} title="Add new hotspot" className="hotspot-add-btn">+</button>
					</div>
					<div className="hotspot-list-body">
						{hotspots.map((hs, index) => (
							<div key={hs.type} className="hotspot-list-row">
								<button
									onClick={() => onSelect(index)}
									className={`hotspot-list-item hotspot-list-item--row ${selected === index ? 'hotspot-list-item--active' : ''}`}
								>
									{hs.info.title.split(' ')[0]} {hs.type.charAt(0).toUpperCase() + hs.type.slice(1)}
									<div className="hotspot-list-item-position">
										top {hs.top} · left {hs.left}
									</div>
								</button>
								{/* Delete Hotspot button */}
								<button onClick={() => onDelete(index)} title="Delete hotspot" className="hotspot-delete-btn">✕</button>
							</div>
						))}
						
						{hotspots.length === 0 && (
							<p className="hotspot-empty-hint">
								No hotspots. Click + to add one.
							</p>
						)}
					</div>
				</div>
				
				{/* Hotspot editor */}
				<div className="panel panel--clip">
					<div className="panel-header">
						✏️ {selected !== null ? `Editing: ${hotspots[selected].type}` : 'Select a hotspot'}
					</div>
					<div className="hotspot-editor-body">
						{selected === null ? (
							<p className="hotspot-editor-placeholder">
								Click a hotspot on the image or pick one from the list to edit its title and description.
							</p>
						) : (
							<div className="hotspot-field-stack">
							
								{/* Type key (read-only) */}
								<div>
									<label style={labelStyle}>Type key</label>
									<input
										style={inputStyle}
										className="hotspot-input--readonly"
										value={hotspots[selected].type}
										readOnly
									/>
									<p className="field-hint">
										Auto-generated identifier — cannot be changed after creation.
									</p>
								</div>
				  
								{/* Position fields */}
								<div className="field-row">
									{(['top', 'left'] as const).map((field) => (
										<div key={field} className="field-row-item">
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
										style={inputStyle}
										className="hotspot-textarea"
										value={hotspots[selected].info.text}
										onChange={(e) => onUpdateInfo(selected, 'text', e.target.value)}
									/>
								</div>
								
								{/* Linked module */}
								<div>
									<label style={labelStyle}>Linked Module</label>
									<div className="field-row">
										<select
											className="linked-module-select"
											style={inputStyle}
											value={hotspots[selected].info.moduleTopic ?? ''}
											onChange={(e) =>
												onUpdateModuleLink(selected, e.target.value || null, null)
											}
										>
											<option value="">None</option>
											{moduleOptions.map((topic) => (
												<option key={topic.value} value={topic.value}>
													{topic.value}
												</option>
											))}
										</select>
										
										{hotspots[selected].info.moduleTopic && (
											<select
												className="linked-module-select"
												style={inputStyle}
												value={hotspots[selected].info.moduleId ?? ''}
												onChange={(e) =>
													onUpdateModuleLink(
														selected,
														hotspots[selected].info.moduleTopic,
														e.target.value || null
													)
												}
											>
												<option value="">Select a module…</option>
												{moduleOptions
													.find((topic) => topic.value === hotspots[selected].info.moduleTopic)
													?.options.map((mod) => (
														<option key={mod.id} value={mod.id}>
															{mod.badgeNum != null ? `${mod.badgeNum}. ${mod.title}` : mod.title}
														</option>
													))}
											</select>
										)}
									</div>
									<p className="field-hint">
										{hotspots[selected].info.moduleTopic && !hotspots[selected].info.moduleId
											? '⚠️ Select a module, or set this back to "None" — saving is disabled until then.'
											: 'Powers the "Learn More" button in this hotspot\u2019s popup. Set to "None" to hide it.'}
									</p>
								</div>

								{/* Embedded Video */}
								<div>
									<label style={labelStyle}>Hotspot Video</label>
									<VideoEditorPanel
										currentVideoUrl={hotspots[selected].info.videoUrl}
										currentVideoType={hotspots[selected].info.videoType}
										videoType={videoType}
										youtubeUrl={youtubeUrl}
										selectedVideoFile={selectedVideoFile}
										videoSaving={videoSaving}
										onChangeVideoType={onChangeVideoType}
										onChangeYoutubeUrl={onChangeYoutubeUrl}
										onSelectVideoFile={onSelectVideoFile}
										onSaveYoutubeVideo={onSaveYoutubeVideo}
										onUploadMp4Video={onUploadMp4Video}
										onRemoveVideo={onRemoveVideo}
										noVideoMessage="Shown under this hotspot's description in its popup."
									/>
								</div>

								<p className="drag-hint">💡 Drag the hotspot on the image to reposition — values above update automatically.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
