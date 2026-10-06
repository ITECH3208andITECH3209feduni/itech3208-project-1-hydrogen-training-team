// app/modules/components/ModuleEditor.tsx
// Edit panel for a module: top-level fields, then a two-column section list + section field editor

import { ModuleData, ModuleSection } from '@/lib/modules/moduleTypes';
import VideoEditorPanel, { VideoType } from '@/components/VideoEditorPanel';

interface ModuleEditorProps {
	draft: ModuleData;
	selectedSection: number | null;
	onSelectSection: (index: number) => void;
	onUpdateField: <K extends keyof ModuleData>(field: K, value: ModuleData[K]) => void;
	onUpdateSection: <K extends keyof ModuleSection>(index: number, field: K, value: ModuleSection[K]) => void;
	onAddSection: () => void;
	onDeleteSection: (index: number) => void;
	onMoveSection: (index: number, direction: 'up' | 'down') => void;
	onUpdateSectionItem: (sectionIndex: number, itemIndex: number, value: string) => void;
	onAddSectionItem: (sectionIndex: number) => void;
	onDeleteSectionItem: (sectionIndex: number, itemIndex: number) => void;

	// Optional module video controls
	videoType?: VideoType;
	youtubeUrl?: string;
	selectedVideoFile?: File | null;
	videoSaving?: boolean;

	onChangeVideoType?: (type: VideoType) => void;
	onChangeYoutubeUrl?: (url: string) => void;
	onSelectVideoFile?: (file: File | null) => void;
	onSaveYoutubeVideo?: () => void;
	onUploadMp4Video?: () => void;
	onRemoveVideo?: () => void;
}

export default function ModuleEditor({
	draft,
	selectedSection,
	onSelectSection,
	onUpdateField,
	onUpdateSection,
	onAddSection,
	onDeleteSection,
	onMoveSection,
	onUpdateSectionItem,
	onAddSectionItem,
	onDeleteSectionItem,
	
	videoType = 'youtube',
	youtubeUrl = '',
	selectedVideoFile = null,
	videoSaving = false,
	onChangeVideoType,
	onChangeYoutubeUrl,
	onSelectVideoFile,
	onSaveYoutubeVideo,
	onUploadMp4Video,
	onRemoveVideo,
}: ModuleEditorProps) {
	const section = selectedSection !== null ? draft.sections[selectedSection] : null;

	return (
		<div className="module-editor-wrap">
			{/* ── Module-level fields ──────────────────────────────────────────── */}
			<div className="panel panel--clip">
				<div className="panel-header">📄 Module Details</div>
				<div className="module-field-grid">

					<div>
						<label className="editor-label">ID (read-only)</label>
						<input className="editor-input module-input--readonly" value={draft.id} readOnly />
						<p className="field-hint">The stable key routes are built from — cannot be changed here.</p>
					</div>

					<div>
						<label className="editor-label">Slug</label>
						<input
							className="editor-input"
							value={draft.slug ?? ''}
							onChange={(e) => onUpdateField('slug', (e.target.value || undefined) as ModuleData['slug'])}
							placeholder="e.g. gas-leak-detection"
						/>
					</div>

					<div>
						<label className="editor-label">Badge Number</label>
						<input
							className="editor-input"
							value={draft.badgeNum ?? ''}
							onChange={(e) => onUpdateField('badgeNum', (e.target.value || undefined) as ModuleData['badgeNum'])}
							placeholder="Leave blank to hide the badge"
						/>
					</div>

					<div>
						<label className="editor-label">Icon</label>
						<input
							className="editor-input"
							value={draft.icon}
							onChange={(e) => onUpdateField('icon', e.target.value)}
							placeholder="e.g. 💨"
						/>
					</div>

					<div>
						<label className="editor-label">Icon Background (CSS color)</label>
						<input
							className="editor-input"
							value={draft.iconBg}
							onChange={(e) => onUpdateField('iconBg', e.target.value)}
							placeholder="e.g. rgba(0,180,216,0.15)"
						/>
					</div>

					<div>
						<label className="editor-label">Title</label>
						<input className="editor-input" value={draft.title} onChange={(e) => onUpdateField('title', e.target.value)} />
					</div>

					<div className="module-field-span-2">
						<label className="editor-label">Description</label>
						<textarea
							className="editor-input module-textarea"
							value={draft.description}
							onChange={(e) => onUpdateField('description', e.target.value)}
						/>
						<p className="field-hint">Shown on the listing card — not on this reader page itself.</p>
					</div>

					<div className="module-field-span-2">
						<label className="editor-label">Key Takeaway</label>
						<textarea
							className="editor-input module-textarea"
							value={draft.keyTakeaway}
							onChange={(e) => onUpdateField('keyTakeaway', e.target.value)}
						/>
					</div>

					<div>
						<label className="editor-label">Previous Module ID</label>
						<input
							className="editor-input"
							value={draft.prevId ?? ''}
							onChange={(e) => onUpdateField('prevId', (e.target.value || undefined) as ModuleData['prevId'])}
							placeholder="Leave blank if this is the first module"
						/>
					</div>

					<div>
						<label className="editor-label">Next Module ID</label>
						<input
							className="editor-input"
							value={draft.nextId ?? ''}
							onChange={(e) => onUpdateField('nextId', (e.target.value || undefined) as ModuleData['nextId'])}
							placeholder="Leave blank if this is the last module"
						/>
					</div>
				</div>
			</div>
			
			{/* Embedded Video */}
			<div className="panel panel--clip">
				<div className="panel-header">🎬 Module Video</div>
				<div className="module-editor-body">
					<VideoEditorPanel
						currentVideoUrl={draft.videoUrl}
						currentVideoType={draft.videoType}
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
						noVideoMessage="No video is currently attached to this module."
					/>
				</div>
			</div>

			{/* ── Sections ──────────────────────────────────────────────────────── */}
			<div className="module-section-editor">

				{/* Section list */}
				<div className="panel panel--clip">
					<div className="panel-header panel-header--spread">
						<span>📑 Sections</span>
						<button onClick={onAddSection} title="Add new section" className="module-add-btn">+</button>
					</div>
					<div className="module-list-body">
						{draft.sections.map((s, index) => (
							<div key={index} className="module-list-row">
								<button
									onClick={() => onSelectSection(index)}
									className={`module-list-item module-list-item--row ${selectedSection === index ? 'module-list-item--active' : ''}`}
								>
									{s.num}. {s.heading || '(untitled)'}
								</button>
								<button
									onClick={() => onMoveSection(index, 'up')}
									disabled={index === 0}
									title="Move up"
									className="module-move-btn"
								>
									↑
								</button>
								<button
									onClick={() => onMoveSection(index, 'down')}
									disabled={index === draft.sections.length - 1}
									title="Move down"
									className="module-move-btn"
								>
									↓
								</button>
								<button onClick={() => onDeleteSection(index)} title="Delete section" className="module-delete-btn">
									✕
								</button>
							</div>
						))}

						{draft.sections.length === 0 && (
							<p className="module-empty-hint">No sections. Click + to add one.</p>
						)}
					</div>
				</div>

				{/* Section field editor */}
				<div className="panel panel--clip">
					<div className="panel-header">
						✏️ {section ? `Editing section ${section.num}` : 'Select a section'}
					</div>
					<div className="module-editor-body">
						{selectedSection === null || !section ? (
							<p className="module-editor-placeholder">
								Click a section in the list to edit its heading, body, list, and callout.
							</p>
						) : (
							<div className="module-field-stack">

								<div>
									<label className="editor-label">Heading</label>
									<input
										className="editor-input"
										value={section.heading}
										onChange={(e) => onUpdateSection(selectedSection, 'heading', e.target.value)}
									/>
								</div>

								<div>
									<label className="editor-label">Body</label>
									<textarea
										className="editor-input module-textarea module-textarea--tall"
										value={section.body}
										onChange={(e) => onUpdateSection(selectedSection, 'body', e.target.value)}
									/>
									<p className="field-hint">
										Blank lines start a new paragraph. Inline HTML (e.g. &lt;strong&gt;) is rendered as-is.
									</p>
								</div>

								<div>
									<label className="editor-label">List Type</label>
									<select
										className="editor-input module-select"
										value={section.listType ?? ''}
										onChange={(e) =>
											onUpdateSection(
												selectedSection,
												'listType',
												(e.target.value || undefined) as ModuleSection['listType']
											)
										}
									>
										<option value="">None</option>
										<option value="ul">Bulleted list</option>
										<option value="ol">Numbered list</option>
									</select>
								</div>

								{(section.listType === 'ul' || section.listType === 'ol') && (
									<div>
										<label className="editor-label">List Items</label>
										{(section.items ?? []).map((item, itemIndex) => (
											<div key={itemIndex} className="field-row module-list-item-row">
												<input
													className="editor-input"
													value={item}
													onChange={(e) => onUpdateSectionItem(selectedSection, itemIndex, e.target.value)}
												/>
												<button
													onClick={() => onDeleteSectionItem(selectedSection, itemIndex)}
													title="Delete item"
													className="module-delete-btn"
												>
													✕
												</button>
											</div>
										))}
										<button onClick={() => onAddSectionItem(selectedSection)} className="module-add-item-btn">
											+ Add item
										</button>
									</div>
								)}

								<div>
									<label className="editor-label">Callout</label>
									<textarea
										className="editor-input module-textarea"
										value={section.callout ?? ''}
										onChange={(e) =>
											onUpdateSection(selectedSection, 'callout', (e.target.value || undefined) as ModuleSection['callout'])
										}
										placeholder="Optional — leave blank to hide"
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
