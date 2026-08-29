// app/modules/components/ModuleVideo.tsx
// Compact module video launcher with pop-in video modal.
// Supports YouTube and MP4 videos.

"use client";

import { useEffect, useState } from "react";

interface ModuleVideoProps {
    videoUrl?: string | null;
    videoType?: "youtube" | "mp4" | null;
}

function getYouTubeEmbedUrl(
    url: string
): string | null {
    try {
        const parsed = new URL(url);

        if (
            parsed.hostname === "www.youtube.com" ||
            parsed.hostname === "youtube.com"
        ) {
            const videoId =
                parsed.searchParams.get("v");

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }

            if (
                parsed.pathname.startsWith(
                    "/embed/"
                )
            ) {
                return url;
            }
        }

        if (
            parsed.hostname === "youtu.be" ||
            parsed.hostname === "www.youtu.be"
        ) {
            const videoId =
                parsed.pathname.slice(1);

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }

        return null;
    } catch {
        return null;
    }
}

export default function ModuleVideo({
    videoUrl,
    videoType,
}: ModuleVideoProps) {
    const [isOpen, setIsOpen] =
        useState(false);

    const embedUrl =
        videoUrl && videoType === "youtube"
            ? getYouTubeEmbedUrl(videoUrl)
            : null;

    const isMp4 =
        !!videoUrl &&
        videoType === "mp4";

    const hasVideo =
        !!embedUrl || isMp4;

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (
            event: KeyboardEvent
        ) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener(
            "keydown",
            handleEscape
        );

        document.body.style.overflow =
            "hidden";

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );

            document.body.style.overflow =
                "";
        };
    }, [isOpen]);

    const openVideo = () => {
        if (hasVideo) {
            setIsOpen(true);
        }
    };

    return (
        <>
            <section className="module-video">
                <div className="module-video-heading">
                    <span>🎥</span>
                    <h2>Module Video</h2>
                </div>

                <button
                    type="button"
                    className={`module-video-launcher ${
                        !hasVideo
                            ? "module-video-launcher--disabled"
                            : ""
                    }`}
                    onClick={openVideo}
                    disabled={!hasVideo}
                    aria-label={
                        hasVideo
                            ? "Open module video"
                            : "Module video coming soon"
                    }
                >
                    <span className="module-video-play">
                        ▶
                    </span>

                    <span className="module-video-launcher-text">
                        <strong>
                            Module Video
                        </strong>

                        <span>
                            {hasVideo
                                ? "Click to view"
                                : "Video content coming soon"}
                        </span>
                    </span>

                    {hasVideo && (
                        <span className="module-video-launch-arrow">
                            →
                        </span>
                    )}
                </button>
            </section>

            {isOpen && hasVideo && (
                <div
                    className="module-video-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Module Video"
                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setIsOpen(false);
                        }
                    }}
                >
                    <div className="module-video-modal-frame">

                        <div className="module-video-modal-header">
                            <div className="module-video-modal-title">
                                <span>🎥</span>

                                <h2>
                                    Module Video
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="module-video-close"
                                onClick={() =>
                                    setIsOpen(false)
                                }
                                aria-label="Close video"
                            >
                                ×
                            </button>
                        </div>

                        <div className="module-video-player">

                            {videoType ===
                                "youtube" &&
                                embedUrl && (
                                    <iframe
                                        src={
                                            embedUrl
                                        }
                                        title="Module training video"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                )}

                            {videoType ===
                                "mp4" &&
                                videoUrl && (
                                    <video
                                        src={videoUrl}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            display:
                                                "block",
                                            background:
                                                "#000",
                                        }}
                                    >
                                        Your browser does not
                                        support MP4 video.
                                    </video>
                                )}

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}