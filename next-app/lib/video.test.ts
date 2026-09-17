// lib/video.test.ts
// Unit tests for the video helpers shared by the modules and lab video routes.
import { describe, it, expect } from 'vitest';
import {
	MAX_MP4_BYTES,
	isMp4File,
	validateMp4File,
	getYouTubeVideoId,
	getStoragePath,
	safeFileName,
} from './video';

// Builds a File with a specific reported size, without allocating that much memory.
function fakeFile(name: string, type: string, size: number): File {
	const file = new File(['x'], name, { type });
	Object.defineProperty(file, 'size', { value: size });
	return file;
}

// 1. Test isMp4File
describe('1. isMp4File', () => {
	it('1.1 accepts a file with the video/mp4 mime type', () => {
		expect(isMp4File(fakeFile('clip.mp4', 'video/mp4', 100))).toBe(true);
	});

	it('1.2 accepts a .mp4 extension even with an unrecognized mime type', () => {
		expect(isMp4File(fakeFile('clip.MP4', 'application/octet-stream', 100))).toBe(true);
	});

	it('1.3 rejects a non-mp4 file', () => {
		expect(isMp4File(fakeFile('clip.mov', 'video/quicktime', 100))).toBe(false);
	});
});

// 2. Test validateMp4File
describe('2. validateMp4File', () => {
	it('2.1 returns null for a valid, in-range mp4 file', () => {
		expect(validateMp4File(fakeFile('clip.mp4', 'video/mp4', 1024))).toBeNull();
	});

	it('2.2 rejects an empty file', () => {
		expect(validateMp4File(fakeFile('clip.mp4', 'video/mp4', 0)))
			.toBe('The selected video is empty.');
	});

	it('2.3 rejects a non-mp4 file', () => {
		expect(validateMp4File(fakeFile('clip.mov', 'video/quicktime', 1024)))
			.toBe('Only MP4 video files are supported.');
	});

	it('2.4 rejects a file over the 50MB limit', () => {
		expect(validateMp4File(fakeFile('clip.mp4', 'video/mp4', MAX_MP4_BYTES + 1)))
			.toBe('MP4 videos must be smaller than 50MB.');
	});

	it('2.5 accepts a file exactly at the 50MB limit', () => {
		expect(validateMp4File(fakeFile('clip.mp4', 'video/mp4', MAX_MP4_BYTES))).toBeNull();
	});
});

// 3. Test getYouTubeVideoId
describe('3. getYouTubeVideoId', () => {
	it('3.1 extracts the id from a standard watch URL', () => {
		expect(getYouTubeVideoId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
	});

	it('3.2 extracts the id from a youtube.com URL without the www subdomain', () => {
		expect(getYouTubeVideoId('https://youtube.com/watch?v=abc123')).toBe('abc123');
	});

	it('3.3 extracts the id from an already-embedded URL', () => {
		expect(getYouTubeVideoId('https://www.youtube.com/embed/abc123')).toBe('abc123');
	});

	it('3.4 extracts the id from a shortened youtu.be URL', () => {
		expect(getYouTubeVideoId('https://youtu.be/abc123')).toBe('abc123');
	});

	it('3.5 returns null for a youtube.com URL with no video id', () => {
		expect(getYouTubeVideoId('https://www.youtube.com/watch')).toBeNull();
	});

	it('3.6 returns null for a non-YouTube URL', () => {
		expect(getYouTubeVideoId('https://vimeo.com/12345')).toBeNull();
	});

	it('3.7 returns null for a malformed URL', () => {
		expect(getYouTubeVideoId('not a url')).toBeNull();
	});
});

// 4. Test getStoragePath
describe('4. getStoragePath', () => {
	it('4.1 extracts the object path from a matching public storage URL', () => {
		const url = 'https://xyz.supabase.co/storage/v1/object/public/lab-videos/gas/12345-clip.mp4';
		expect(getStoragePath(url, 'lab-videos')).toBe('gas/12345-clip.mp4');
	});

	it('4.2 returns null when the URL is for a different bucket', () => {
		const url = 'https://xyz.supabase.co/storage/v1/object/public/module-videos/1/12345-clip.mp4';
		expect(getStoragePath(url, 'lab-videos')).toBeNull();
	});

	it('4.3 returns null for a malformed URL', () => {
		expect(getStoragePath('not a url', 'lab-videos')).toBeNull();
	});
});

// 5. Test safeFileName
describe('5. safeFileName', () => {
	it('5.1 lowercases the file name', () => {
		expect(safeFileName('MyVideo.MP4')).toBe('myvideo.mp4');
	});

	it('5.2 replaces spaces and unsafe characters with hyphens', () => {
		expect(safeFileName('my video (final)!.mp4')).toBe('my-video--final--.mp4');
	});

	it('5.3 leaves an already-safe file name unchanged', () => {
		expect(safeFileName('clip-01.mp4')).toBe('clip-01.mp4');
	});
});