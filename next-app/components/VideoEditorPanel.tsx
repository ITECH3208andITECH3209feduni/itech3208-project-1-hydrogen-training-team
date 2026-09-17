// components/VideoEditorPanel.tsx
// Shared editor block for embedded videos (used by modules and lab pages)
// Caller supplies the currently persisted video plus in-progress draft state, and wraps this in whatever panel/label chrome fits its own editor.

import { labelStyle, inputStyle } from '@/components/editorStyles';

export type VideoType = 'youtube' | 'mp4';

interface VideoEditorPanelProps {
	currentVideoUrl?: string | null;
	currentVideoType?: VideoType | null;

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

	noVideoMessage?: string;
}

export default function VideoEditorPanel({
	currentVideoUrl,
	currentVideoType,
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
	noVideoMessage = 'No video is currently attached.',
}: VideoEditorPanelProps) {
	return (
		<div className="module-field-stack">

			{currentVideoUrl && currentVideoType && (
				<div>
					<label style={labelStyle}>Current Video</label>
					<p className="field-hint">
						Type: {currentVideoType === 'youtube' ? 'YouTube' : 'MP4'}
					</p>
					<p className="field-hint" style={{ wordBreak: 'break-all' }}>
						{currentVideoUrl}
					</p>
					{onRemoveVideo && (
						<button 
                            type="button"
                            onClick={onRemoveVideo}
                            disabled={videoSaving}
                            className="module-delete-btn"
                        >
							Remove Video
						</button>
					)}
				</div>
			)}

			<div>
				<label style={labelStyle}>Video Type</label>
				<select
					style={inputStyle}
					className="module-select"
					value={videoType}
					onChange={(e) => onChangeVideoType?.(e.target.value as VideoType)}
					disabled={videoSaving}
				>
					<option value="youtube">YouTube</option>
					<option value="mp4">Upload MP4</option>
				</select>
			</div>

			{videoType === 'youtube' && (
				<div>
					<label style={labelStyle}>YouTube URL</label>
					<input
						type="url"
						style={inputStyle}
						value={youtubeUrl}
						onChange={(e) => onChangeYoutubeUrl?.(e.target.value)}
						placeholder="https://www.youtube.com/watch?v=..."
						disabled={videoSaving}
					/>
					{onSaveYoutubeVideo && (
						<button 
                            type="button"
                            onClick={onSaveYoutubeVideo}
                            disabled={videoSaving || !youtubeUrl.trim()}
                            className="module-add-item-btn"
                        >
							{videoSaving ? 'Saving...' : 'Save YouTube Video'}
						</button>
					)}
				</div>
			)}

			{videoType === 'mp4' && (
				<div>
					<label style={labelStyle}>MP4 Video File (max 50MB)</label>
					<input
						type="file"
						accept="video/mp4,.mp4"
						onChange={(e) => onSelectVideoFile?.(e.target.files?.[0] ?? null)}
						disabled={videoSaving}
					/>
					{selectedVideoFile && <p className="field-hint">Selected: {selectedVideoFile.name}</p>}
					{onUploadMp4Video && (
						<button 
                            type="button"
                            onClick={onUploadMp4Video}
                            disabled={videoSaving || !selectedVideoFile}
                            className="module-add-item-btn"
                        >
							{videoSaving ? 'Uploading...' : 'Upload MP4 Video'}
						</button>
					)}
				</div>
			)}

			{!currentVideoUrl && <p className="field-hint">{noVideoMessage}</p>}
		</div>
	);
}