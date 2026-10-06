// components/EmbeddedVideo.tsx
// Compact video launcher with pop-in video modal.
// Supports YouTube and MP4 videos.

"use client";

import { useEffect, useState } from "react";

interface EmbeddedVideoProps {
    videoUrl?: string | null;
    videoType?: "youtube" | "mp4" | null;
}

function getYouTubeEmbedUrl(url: string): string | null {
    try {
        const parsed = new URL(url);

        if (parsed.hostname === "www.youtube.com" || parsed.hostname === "youtube.com") {
            const videoId = parsed.searchParams.get("v");

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }

            if (parsed.pathname.startsWith("/embed/")) {
                return url;
            }
        }

        if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
            const videoId = parsed.pathname.slice(1);

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }

        return null;
    } catch {
        return null;
    }
}

export default function EmbeddedVideo({ videoUrl, videoType, }: EmbeddedVideoProps) {
    const [isOpen, setIsOpen] = useState(false);

    const embedUrl = videoUrl && videoType === "youtube"
        ? getYouTubeEmbedUrl(videoUrl)
        : null;

    const isMp4 = !!videoUrl && videoType === "mp4";

    const hasVideo = !!embedUrl || isMp4;

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!hasVideo) {
        return null;
    }

    const openVideo = () => {
        setIsOpen(true);
    };

    return (
        <>
            <section className="embed-video">
                <button
                    type="button"
                    className="embed-video-launcher"
                    onClick={openVideo}
                    aria-label="Open embedded video"
                >
                    <span className="embed-video-play">▶</span>

                    <span className="embed-video-launcher-text">
                        <strong>Embedded Video</strong>
                        <span>Click to view</span>
                    </span>

                    <span className="embed-video-launch-arrow">→</span>
                </button>
            </section>

            {isOpen && (
                <div
                    className="embed-video-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Embedded Video"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsOpen(false);
                        }
                    }}
                >
                    <div className="embed-video-modal-frame">
                        <div className="embed-video-modal-header">
                            <div className="embed-video-modal-title">
                                <span>🎥</span>
                                <h2>Embedded Video</h2>
                            </div>

                            <button
                                type="button"
                                className="embed-video-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close video"
                            >
                                ×
                            </button>
                        </div>

                        <div className="embed-video-player">
                            {videoType ===
                                "youtube" &&
                                embedUrl && (
                                    <iframe
                                        src={embedUrl}
                                        title="Training video"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                )}

                            {videoType === "mp4" && videoUrl && (
                                <video
                                    src={videoUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="embed-video-native"
                                >
                                    Your browser does not support MP4 video.
                                </video>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}