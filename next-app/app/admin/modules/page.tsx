"use client";

import "./admin-modules.css";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const VIDEO_SECTION = "hazard-modules";

interface ModuleOption {
    section: string;
    id: string;
    badge_num: number | null;
    title: string;
}

interface ModuleVideo {
    id: string;
    section: string;
    title: string;
    video_url: string | null;
    video_type: "youtube" | "mp4" | null;
}

export default function AdminModulesPage() {
    const { loading, profile, isAdmin } = useAuth();
    const router = useRouter();

    const [modules, setModules] = useState<ModuleOption[]>([]);
    const [selectedId, setSelectedId] = useState("");

    const [currentVideo, setCurrentVideo] =
        useState<ModuleVideo | null>(null);

    const [youtubeUrl, setYoutubeUrl] = useState("");

    const [videoMode, setVideoMode] =
        useState<"youtube" | "mp4">("youtube");

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [loadingModules, setLoadingModules] =
        useState(true);

    const [loadingVideo, setLoadingVideo] =
        useState(false);

    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading) {
            if (!profile || !isAdmin) {
                router.replace("/dashboard");
                return;
            }

            loadModules();
        }
    }, [loading, profile, isAdmin, router]);

    async function getToken() {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            throw new Error("Not authenticated");
        }

        return user.getIdToken();
    }

    async function loadModules() {
        try {
            setLoadingModules(true);
            setError("");

            const response = await fetch(
                "/api/load-module-options",
                {
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error ||
                        "Failed to load modules."
                );
            }

            /*
             * The shared endpoint also returns the existing
             * Guide modules.
             *
             * This page manages videos for the Hydrogen
             * Safety Modules only, so we filter the response
             * locally without changing the shared API.
             */
            const loadedModules =
                (data.data ?? []).filter(
                    (module: ModuleOption) =>
                        module.section ===
                        VIDEO_SECTION
                );

            setModules(loadedModules);

            if (loadedModules.length > 0) {
                setSelectedId(
                    String(loadedModules[0].id)
                );
            } else {
                setSelectedId("");
                setCurrentVideo(null);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load modules."
            );
        } finally {
            setLoadingModules(false);
        }
    }

    async function loadVideo(moduleId: string) {
        try {
            setLoadingVideo(true);
            setError("");
            setMessage("");

            /*
             * The module list has already been filtered to
             * hazard-modules, so we can safely identify the
             * selected module by ID here.
             */
            const moduleOption = modules.find(
                (module) =>
                    module.section ===
                        VIDEO_SECTION &&
                    String(module.id) ===
                        String(moduleId)
            );

            if (!moduleOption) {
                throw new Error(
                    "Selected module could not be found."
                );
            }

            const response = await fetch(
                `/api/load-modules?section=${encodeURIComponent(
                    VIDEO_SECTION
                )}`,
                {
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error ||
                        "Failed to load module."
                );
            }

            const module =
                (data.data ?? []).find(
                    (item: ModuleVideo) =>
                        String(item.id) === String(moduleId)
                );

            if (!module) {
                throw new Error(
                    "Module could not be found."
                );
            }

            setCurrentVideo(module);

            if (
                module.video_type === "youtube"
            ) {
                setVideoMode("youtube");
                setYoutubeUrl(
                    module.video_url ?? ""
                );
                setSelectedFile(null);
            } else if (
                module.video_type === "mp4"
            ) {
                setVideoMode("mp4");
                setYoutubeUrl("");
                setSelectedFile(null);
            } else {
                setVideoMode("youtube");
                setYoutubeUrl("");
                setSelectedFile(null);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load video."
            );
        } finally {
            setLoadingVideo(false);
        }
    }

    useEffect(() => {
        if (selectedId) {
            loadVideo(selectedId);
        }
    }, [selectedId, modules]);

    async function saveYouTube() {
        if (!youtubeUrl.trim()) {
            setError(
                "Please enter a YouTube URL."
            );
            return;
        }

        try {
            setSaving(true);
            setError("");
            setMessage("");

            const token = await getToken();

            const formData = new FormData();

            formData.append(
                "moduleId",
                selectedId
            );

            formData.append(
                "section",
                VIDEO_SECTION
            );

            formData.append(
                "videoType",
                "youtube"
            );

            formData.append(
                "videoUrl",
                youtubeUrl.trim()
            );

            const response = await fetch(
                "/api/admin/modules/video",
                {
                    method: "PUT",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data =
                await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error ||
                        "Failed to save video."
                );
            }

            setCurrentVideo(data.module);

            setVideoMode("youtube");

            setMessage(
                "YouTube video saved successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save video."
            );
        } finally {
            setSaving(false);
        }
    }

    async function uploadMp4() {
        if (!selectedFile) {
            setError(
                "Please select an MP4 file."
            );
            return;
        }

        if (
            selectedFile.type !==
                "video/mp4" &&
            !selectedFile.name
                .toLowerCase()
                .endsWith(".mp4")
        ) {
            setError(
                "Please select an MP4 video."
            );
            return;
        }

        try {
            setSaving(true);
            setError("");
            setMessage("");

            const token = await getToken();

            const formData = new FormData();

            formData.append(
                "moduleId",
                selectedId
            );

            formData.append(
                "section",
                VIDEO_SECTION
            );

            formData.append(
                "videoType",
                "mp4"
            );

            formData.append(
                "file",
                selectedFile
            );

            const response = await fetch(
                "/api/admin/modules/video",
                {
                    method: "PUT",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data =
                await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error ||
                        "Failed to upload video."
                );
            }

            setCurrentVideo(data.module);

            setSelectedFile(null);

            setVideoMode("mp4");

            setMessage(
                "MP4 video uploaded successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to upload video."
            );
        } finally {
            setSaving(false);
        }
    }

    async function removeVideo() {
        const confirmed =
            window.confirm(
                "Remove the video from this module?"
            );

        if (!confirmed) {
            return;
        }

        try {
            setSaving(true);
            setError("");
            setMessage("");

            const token = await getToken();

            const response = await fetch(
                "/api/admin/modules/video",
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        moduleId: selectedId,
                        section: VIDEO_SECTION,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error ||
                        "Failed to remove video."
                );
            }

            setCurrentVideo(data.module);

            setYoutubeUrl("");

            setSelectedFile(null);

            setVideoMode("youtube");

            setMessage(
                "Video removed successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to remove video."
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading || loadingModules) {
        return (
            <main className="main">
                <div className="admin-module-page">
                    <p>
                        Loading module management...
                    </p>
                </div>
            </main>
        );
    }

    if (!profile || !isAdmin) {
        return null;
    }

    return (
        <main className="main">
            <div className="admin-module-page">

                <div className="admin-module-header">
                    <div>
                        <div className="eyebrow">
                            ADMINISTRATION
                        </div>

                        <h1>
                            Module Management
                        </h1>

                        <p>
                            Add, replace or remove
                            training videos for
                            Hydrogen Safety Modules.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="admin-video-error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="admin-video-success">
                        {message}
                    </div>
                )}

                <section className="admin-module-panel">

                    <div className="form-group">
                        <label htmlFor="module">
                            Select Module
                        </label>

                        <select
                            id="module"
                            value={selectedId}
                            onChange={(event) =>
                                setSelectedId(
                                    event.target.value
                                )
                            }
                        >
                            {modules.map(
                                (module) => (
                                    <option
                                        key={`${module.section}-${module.id}`}
                                        value={module.id}
                                    >
                                        {module.badge_num
                                            ? `${module.badge_num}. `
                                            : ""}
                                        {module.title}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {loadingVideo ? (
                        <p>
                            Loading video...
                        </p>
                    ) : (
                        <>
                            <div className="current-video-box">

                                <h2>
                                    Current Video
                                </h2>

                                {currentVideo?.video_url ? (
                                    <>
                                        <div className="video-status">
                                            <span>
                                                &#10003;
                                            </span>

                                            <div>
                                                <strong>
                                                    Video attached
                                                </strong>

                                                <small>
                                                    {currentVideo.video_type ===
                                                    "mp4"
                                                        ? "MP4 video"
                                                        : "YouTube video"}
                                                </small>
                                            </div>
                                        </div>

                                        <p className="current-video-url">
                                            {currentVideo.video_url}
                                        </p>

                                        <button
                                            type="button"
                                            className="remove-video-btn"
                                            onClick={
                                                removeVideo
                                            }
                                            disabled={
                                                saving
                                            }
                                        >
                                            Remove Video
                                        </button>
                                    </>
                                ) : (
                                    <div className="no-video">
                                        <strong>
                                            No video attached
                                        </strong>

                                        <span>
                                            Add a YouTube
                                            video or
                                            upload an MP4
                                            below.
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="video-type-tabs">

                                <button
                                    type="button"
                                    className={
                                        videoMode ===
                                        "youtube"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setVideoMode(
                                            "youtube"
                                        )
                                    }
                                >
                                    YouTube
                                </button>

                                <button
                                    type="button"
                                    className={
                                        videoMode ===
                                        "mp4"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setVideoMode(
                                            "mp4"
                                        )
                                    }
                                >
                                    Upload MP4
                                </button>

                            </div>

                            {videoMode ===
                                "youtube" && (
                                <div className="video-editor">

                                    <div className="form-group">
                                        <label htmlFor="youtube-url">
                                            YouTube URL
                                        </label>

                                        <input
                                            id="youtube-url"
                                            type="url"
                                            value={
                                                youtubeUrl
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setYoutubeUrl(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="https://www.youtube.com/watch?v=..."
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="save-video-btn"
                                        onClick={
                                            saveYouTube
                                        }
                                        disabled={
                                            saving
                                        }
                                    >
                                        {saving
                                            ? "Saving..."
                                            : "Save YouTube Video"}
                                    </button>

                                </div>
                            )}

                            {videoMode ===
                                "mp4" && (
                                <div className="video-editor">

                                    <div className="form-group">
                                        <label htmlFor="mp4-file">
                                            MP4 Video
                                        </label>

                                        <input
                                            id="mp4-file"
                                            type="file"
                                            accept="video/mp4,.mp4"
                                            onChange={(
                                                event
                                            ) =>
                                                setSelectedFile(
                                                    event
                                                        .target
                                                        .files?.[0] ??
                                                        null
                                                )
                                            }
                                        />

                                        {selectedFile && (
                                            <span className="selected-file">
                                                {selectedFile.name}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className="save-video-btn"
                                        onClick={
                                            uploadMp4
                                        }
                                        disabled={
                                            saving ||
                                            !selectedFile
                                        }
                                    >
                                        {saving
                                            ? "Uploading..."
                                            : "Upload MP4 Video"}
                                    </button>

                                </div>
                            )}

                        </>
                    )}

                </section>
            </div>
        </main>
    );
}

