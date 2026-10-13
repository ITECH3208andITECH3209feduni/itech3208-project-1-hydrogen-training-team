// app/modules/components/ModuleReaderPage.tsx
// Wrapper for module pages, with learner progress tracking & in-app editing
// Edit mode entered/exited via toggle switch (only visible to admins)

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ModuleData, getModuleById, isModuleLocked } from "@/lib/modules/moduleTypes";
import SectionBlock from "./SectionBlock";
import EmbeddedVideo from "@/components/EmbeddedVideo";
import ModuleEditor from "./ModuleEditor";
import EditModeToggle from "@/components/EditModeToggle";
import SaveBar from "@/components/SaveBar";
import { useModuleProgress } from "@/hooks/modules/useModuleProgress";
import { useModuleEditor } from "@/hooks/modules/useModuleEditor";
import { useLeaveWarning } from "@/hooks/unsavedChanges/useLeaveWarning";

interface ModuleReaderPageProps {
    item:           ModuleData | undefined;
    allModules:     ModuleData[];
    topic:          string;
    basePath:       string;
    badgeLabel?:    string;
    heroHint:       string;
    backLabel?:     string;
    usingDefaults?: boolean;
    defaults?:      ModuleData[];   // Used for reverting to default in edit mode
    reload?:        () => void
}

export default function ModuleReaderPage({
    item,
    allModules,
    topic,
    basePath,
    badgeLabel,
    heroHint,
    backLabel = "Back",
    usingDefaults = false,
    defaults,
    reload,
}: ModuleReaderPageProps) {
    const { user, loading, permissions } = useAuth();
    const router = useRouter();
    // Admins bypass locking — they need access to any module to edit it.
    const locked = item && !permissions.canManageUsers ? isModuleLocked(item, allModules) : false;

    const {
        currentProgress,
        progressLoaded,
        restarting,
        continueFromSavedProgress,
        restartModule,
        sectionsReached,
        markSectionRead,
    } = useModuleProgress({
        moduleId: item?.id ?? "",
        topic,
        sectionCount: item?.sections.length ?? 0,
        user,
        loading,
    });

    const fallbackItem = item ? getModuleById(defaults ?? [], item.id) : undefined;

    const {
        editMode,
        toggleEditMode,
        hasUnsavedChanges,
        draft,
        selectedSection,
        setSelectedSection,
        saveStatus,
        updateField,
        updateSection,
        addSection,
        deleteSection,
        moveSection,
        updateSectionItem,
        addSectionItem,
        deleteSectionItem,
        saveToSupabase,
        resetToDefaults,
        canReset,
        videoDraftType,
        videoDraftYoutubeUrl,
        videoDraftFile,
        videoSaving,
        changeVideoDraftType,
        changeVideoDraftYoutubeUrl,
        selectVideoDraftFile,
        saveYoutubeVideo,
        uploadMp4Video,
        removeEmbeddedVideo,
    } = useModuleEditor(topic, item, fallbackItem, { onSaved: reload });

    useLeaveWarning(hasUnsavedChanges);

    // Section locks: learners unlock sections one at a time with the Continue button.
    // Starts at 1 (first section open) and resets when the module changes or is restarted.
    const [sectionsUnlocked, setSectionsUnlocked] = useState(1);

    useEffect(() => {
        setSectionsUnlocked(1);
    }, [item?.id]);

    // Scroll to a newly unlocked section once it has rendered.
    const [scrollToSection, setScrollToSection] = useState<number | null>(null);

    useEffect(() => {
        if (scrollToSection === null) return;
        const sections = document.querySelectorAll<HTMLElement>("[data-module-section]");
        sections[scrollToSection - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
        setScrollToSection(null);
    }, [scrollToSection]);

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!loading && user && !item) {
            router.replace(basePath);
        }
    }, [loading, user, item, router, basePath]);

    useEffect(() => {
        if (!loading && user && item && locked) {
            router.replace(basePath);
        }
    }, [loading, user, item, locked, router, basePath]);

    // Safety Net - Exit edit mode if lose permission mid-session (e.g. role change)
    useEffect(() => {
        if (editMode && !permissions.canManageUsers) {
            toggleEditMode();
        }
    }, [editMode, permissions.canManageUsers, toggleEditMode]);

    if (loading) {
        return <div>Loading…</div>;
    }

    if (!user) {
        return null;
    }

    if (!item) {
        return null;
    }

    if (locked) {
        return null;
    }

    // While editing, edits show live above the editor panel
    // Otherwise it shows the live/loaded item as before
    const displayed = editMode && draft ? draft : item;

    const hasBadge =
        displayed.badgeNum !== undefined &&
        !!badgeLabel;

    // Admins (and edit mode) see every section; learners see the ones they've reached or unlocked.
    const sectionTotal = displayed.sections.length;
    const sectionsGated = !permissions.canManageUsers && !editMode;
    const visibleSectionCount = sectionsGated
        ? Math.min(sectionTotal, Math.max(1, sectionsReached, sectionsUnlocked))
        : sectionTotal;
    const allSectionsUnlocked = visibleSectionCount >= sectionTotal;
    const moduleComplete = currentProgress >= 100;

    // Marks the current last-visible section as read, then unlocks the next one.
    function unlockNextSection() {
        markSectionRead(visibleSectionCount);
        setSectionsUnlocked(visibleSectionCount + 1);
        setScrollToSection(visibleSectionCount + 1);
    }

    async function handleRestart() {
        await restartModule();
        setSectionsUnlocked(1);
    }

    return (
        <main
            className="main module-reader-main"
            data-slug={displayed.slug}
        >
            {/* Edit mode toggle — only visible to permitted users */}
            {permissions.canManageUsers && (
                <EditModeToggle editMode={editMode} onToggle={toggleEditMode} />
            )}

            {/* Breadcrumb */}
            <div className="back-crumb">
                <Link href={basePath}>
                    ← {backLabel}
                </Link>

                {" / "}

                {hasBadge
                    ? `${badgeLabel} ${displayed.badgeNum} – `
                    : ""}

                {displayed.title}
            </div>

            {/* Hero */}
            <div className="module-hero">
                <div
                    className="module-icon-big"
                    style={{ background: displayed.iconBg, }}
                >
                    {displayed.icon}
                </div>

                <div className="module-hero-text">
                    {hasBadge && (
                        <div className="hazard-label">
                            {badgeLabel} {displayed.badgeNum}
                        </div>
                    )}

                    <h1>{displayed.title}</h1>
                    <p>{heroHint}</p>
                </div>
            </div>

            {/* Fallback content warning */}
            {usingDefaults && !editMode && (
                <div className="fallback-warning">
                    ⚠️ You are viewing fallback content because live content could not be loaded.
                    Your progress on this module may not accurately reflect the current version.
                </div>
            )}

            {/* Saved progress */}
            {progressLoaded && currentProgress > 0 && (
                <div className="module-progress-card">
                    <div className="module-progress-card-header">
                        <span>Progress</span>
                        <strong>{currentProgress}%</strong>
                    </div>

                    <div className="module-progress-track">
                        <div
                            className="module-progress-fill"
                            style={{ width: `${currentProgress}%`, }}
                        />
                    </div>
                </div>
            )}

            {/* Manual resume */}
            {progressLoaded && currentProgress > 0 && currentProgress < 100 && (
                <button
                    type="button"
                    onClick={continueFromSavedProgress}
                    className="module-secondary-btn module-resume-btn"
                >
                    Continue from saved progress
                </button>
            )}

            {/* Sections — later ones stay locked until the learner continues */}
            {displayed.sections.slice(0, visibleSectionCount).map((section) => (
                <div
                    key={section.num}
                    data-module-section
                    data-section-number={section.num}
                >
                    <SectionBlock section={section}/>
                </div>
            ))}

            {/* Section lock — Continue button + list of what's still locked */}
            {!allSectionsUnlocked && (
                <div className="section-gate">
                    <button
                        type="button"
                        onClick={unlockNextSection}
                        className="nav-btn teal section-gate-btn"
                    >
                        Continue to section {visibleSectionCount + 1} →
                    </button>

                    <ul className="section-locked-list">
                        {displayed.sections.slice(visibleSectionCount).map((section) => (
                            <li key={section.num} className="section-locked-item">
                                🔒 {section.num} – {section.heading}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Video + takeaway unlock with the last section */}
            {allSectionsUnlocked && (
                <>
                    {/* Embedded Video */}
                    <EmbeddedVideo
                        videoUrl={displayed.videoUrl}
                        videoType={displayed.videoType}
                    />

                    {/* Key Takeaway */}
                    <div className="takeaway-box">
                        <h3>🔑 Key Takeaway</h3>
                        <p>{displayed.keyTakeaway}</p>
                    </div>
                </>
            )}

            {/* Finish — covers a last section too short/tall for scroll tracking to register */}
            {sectionsGated && allSectionsUnlocked && progressLoaded && !moduleComplete && (
                <div className="section-gate">
                    <button
                        type="button"
                        onClick={() => markSectionRead(sectionTotal)}
                        className="nav-btn teal section-gate-btn"
                    >
                        Finish module ✓
                    </button>
                </div>
            )}

            {/* Completion / restart */}
            {currentProgress >= 100 && (
                <div className="module-completion-card">
                    <strong>
                        Module completed
                    </strong>

                    <div className="module-completion-subtext">
                        You can review this
                        module at any time.
                    </div>

                    <button
                        type="button"
                        onClick={handleRestart}
                        disabled={restarting}
                        className="module-secondary-btn module-restart-btn"
                    >
                        {restarting
                            ? "Restarting..."
                            : "Restart Module"}
                    </button>
                </div>
            )}

            {/* Prev / Next navigation */}
            <div className="module-nav">
                {displayed.prevId ? (
                    <Link
                        href={`${basePath}/${displayed.prevId}`}
                        className="nav-btn"
                    >
                        ← Previous
                    </Link>
                ) : (
                    <span />
                )}

                {displayed.nextId && sectionsGated && !moduleComplete ? (
                    <span
                        className="nav-btn nav-btn-locked"
                        title="Finish this module to unlock the next one"
                        aria-disabled="true"
                    >
                        🔒 Next
                    </span>
                ) : displayed.nextId ? (
                    <Link
                        href={`${basePath}/${displayed.nextId}`}
                        className="nav-btn teal"
                    >
                        Next →
                    </Link>
                ) : (
                    <Link
                        href={basePath}
                        className="nav-btn teal"
                    >
                        ← {backLabel}
                    </Link>
                )}
            </div>

            {/* Edit panel — only visible in edit mode */}
            {editMode && draft && (
                <ModuleEditor
                    draft={draft}
                    selectedSection={selectedSection}
                    onSelectSection={setSelectedSection}
                    onUpdateField={updateField}
                    onUpdateSection={updateSection}
                    onAddSection={addSection}
                    onDeleteSection={deleteSection}
                    onMoveSection={moveSection}
                    onUpdateSectionItem={updateSectionItem}
                    onAddSectionItem={addSectionItem}
                    onDeleteSectionItem={deleteSectionItem}
                    videoType={videoDraftType}
                    youtubeUrl={videoDraftYoutubeUrl}
                    selectedVideoFile={videoDraftFile}
                    videoSaving={videoSaving}
                    onChangeVideoType={changeVideoDraftType}
                    onChangeYoutubeUrl={changeVideoDraftYoutubeUrl}
                    onSelectVideoFile={selectVideoDraftFile}
                    onSaveYoutubeVideo={saveYoutubeVideo}
                    onUploadMp4Video={uploadMp4Video}
                    onRemoveVideo={removeEmbeddedVideo}
                />
            )}

            {/* Save / reset bar — only visible in edit mode */}
            {editMode && (
                <SaveBar
                    saveStatus={saveStatus}
                    onReset={resetToDefaults}
                    onSave={saveToSupabase}
                    resetDisabled={!canReset}
                    resetDisabledReason="No bundled default exists for this module to reset to."
                />
            )}
        </main>
    );
}