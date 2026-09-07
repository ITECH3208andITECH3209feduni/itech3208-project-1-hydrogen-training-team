// app/modules/components/ModuleReaderPage.tsx
// Wrapper for module pages, with learner progress tracking & in-app editing
// Edit mode entered/exited via toggle switch (only visible to admins)

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ModuleData, getModuleById } from "@/lib/moduleTypes";
import SectionBlock from "./SectionBlock";
import EditModeToggle from "@/components/EditModeToggle";
import ModuleEditor from "./ModuleEditor";
import SaveBar from "@/components/SaveBar";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { useModuleEditor } from "@/hooks/useModuleEditor";

interface ModuleReaderPageProps {
    item: ModuleData | undefined;
    section: string;
    basePath: string;
    badgeLabel?: string;
    heroHint: string;
    backLabel?: string;
    usingDefaults?: boolean;
    defaults?: ModuleData[];   // Used for reverting to default in edit mode
}

export default function ModuleReaderPage({
    item,
    section,
    basePath,
    badgeLabel,
    heroHint,
    backLabel = "Back",
    usingDefaults = false,
    defaults,
}: ModuleReaderPageProps) {
    const { user, loading, permissions } = useAuth();
    const router = useRouter();

    const {
        currentProgress,
        progressLoaded,
        restarting,
        continueFromSavedProgress,
        restartModule,
    } = useModuleProgress({
        moduleId: item?.id ?? "",
        section,
        sectionCount: item?.sections.length ?? 0,
        user,
        loading,
    });

    const fallbackItem = item ? getModuleById(defaults ?? [], item.id) : undefined;

    const {
        editMode,
        toggleEditMode,
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
    } = useModuleEditor(section, item, fallbackItem);

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

    // While editing, edits show live above the editor panel
    // Otherwise it shows the live/loaded item as before
    const displayed = editMode && draft ? draft : item;

    const hasBadge =
        displayed.badgeNum !== undefined &&
        !!badgeLabel;

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
                    onClick={
                        continueFromSavedProgress
                    }
                    className="module-secondary-btn module-resume-btn"
                >
                    Continue from saved progress
                </button>
            )}

            {/* Sections */}
            {displayed.sections.map((section) => (
                <div
                    key={section.num}
                    data-module-section
                    data-section-number={section.num}
                >
                    <SectionBlock section={section}/>
                </div>
            ))}

            {/* Key Takeaway */}
            <div className="takeaway-box">
                <h3>🔑 Key Takeaway</h3>
                <p>{displayed.keyTakeaway}</p>
            </div>

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
                        onClick={restartModule}
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

                {displayed.nextId ? (
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