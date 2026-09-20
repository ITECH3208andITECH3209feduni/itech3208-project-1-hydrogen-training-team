// lib/video/video.ts
// Shared helpers for the modules and hazards video routes, plus the client-side upload paths that need the same MP4 size limit.

export const MAX_MP4_BYTES = 50 * 1024 * 1024; // 50MB

// Validates if a file is of mp4 format
export function isMp4File(file: File): boolean {
    return (
        file.type === "video/mp4" ||
        file.name.toLowerCase().endsWith(".mp4")
    );
}

// Returns an error message if the file fails validation, or null if it's fine
export function validateMp4File(file: File): string | null {
    if (file.size === 0) {
        return "The selected video is empty.";
    }
    if (!isMp4File(file)) {
        return "Only MP4 video files are supported.";
    }
    if (file.size > MAX_MP4_BYTES) {
        return "MP4 videos must be smaller than 50MB.";
    }
    return null;
}

export function getYouTubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        if (hostname === "youtube.com" || hostname === "www.youtube.com") {
            if (parsed.pathname === "/watch") {
                return parsed.searchParams.get("v");
            }
            if (parsed.pathname.startsWith("/embed/")) {
                return parsed.pathname.split("/embed/")[1] || null;
            }
        }

        if (hostname === "youtu.be" || hostname === "www.youtu.be") {
            return parsed.pathname.substring(1) || null;
        }

        return null;
    } catch {
        return null;
    }
}

export function getStoragePath(videoUrl: string, bucket: string): string | null {
    try {
        const url = new URL(videoUrl);
        const marker = `/storage/v1/object/public/${bucket}/`;
        const index = url.pathname.indexOf(marker);
        if (index === -1) return null;
        return url.pathname.substring(index + marker.length);
    } catch {
        return null;
    }
}

export function safeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}