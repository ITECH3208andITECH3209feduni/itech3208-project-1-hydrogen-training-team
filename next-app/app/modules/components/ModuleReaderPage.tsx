// app/modules/components/ModuleReaderPage.tsx
// Wrapper for module pages with learner progress tracking.

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ModuleData } from "@/lib/moduleTypes";
import SectionBlock from "./SectionBlock";
import { useModuleProgress } from "@/hooks/useModuleProgress";

interface ModuleReaderPageProps {
    item: ModuleData | undefined;
    section: string;
    basePath: string;
    badgeLabel?: string;
    heroHint: string;
    backLabel?: string;
    usingDefaults?: boolean;
}

export default function ModuleReaderPage({
    item,
    section,
    basePath,
    badgeLabel,
    heroHint,
    backLabel = "Back",
    usingDefaults = false,
}: ModuleReaderPageProps) {
    const { user, loading } = useAuth();
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

    if (loading) {
        return <div>Loading…</div>;
    }

    if (!user) {
        return null;
    }

    if (!item) {
        return null;
    }

    const hasBadge =
        item.badgeNum !== undefined &&
        !!badgeLabel;

    return (
        <main
            className="main"
            style={{
                maxWidth: "820px",
            }}
            data-slug={item.slug}
        >
            {/* Breadcrumb */}
            <div className="back-crumb">
                <Link href={basePath}>
                    ← {backLabel}
                </Link>

                {" / "}

                {hasBadge
                    ? `${badgeLabel} ${item.badgeNum} – `
                    : ""}

                {item.title}
            </div>

            {/* Hero */}
            <div className="module-hero">
                <div
                    className="module-icon-big"
                    style={{
                        background: item.iconBg,
                    }}
                >
                    {item.icon}
                </div>

                <div className="module-hero-text">
                    {hasBadge && (
                        <div className="hazard-label">
                            {badgeLabel} {item.badgeNum}
                        </div>
                    )}

                    <h1>{item.title}</h1>
                    <p>{heroHint}</p>
                </div>
            </div>

            {/* Fallback content warning */}
            {usingDefaults && (
                <div className="fallback-warning">
                    ⚠️ You are viewing fallback
                    content because live content
                    could not be loaded. Your
                    progress on this module may not
                    accurately reflect the current
                    version.
                </div>
            )}

            {/* Saved progress */}
            {progressLoaded &&
                currentProgress > 0 && (
                    <div
                        style={{
                            marginBottom: "20px",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            background:
                                "rgba(0, 180, 216, 0.08)",
                            border:
                                "1px solid rgba(0, 180, 216, 0.25)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                marginBottom: "7px",
                                fontSize: "0.85rem",
                            }}
                        >
                            <span>Progress</span>

                            <strong>
                                {currentProgress}%
                            </strong>
                        </div>

                        <div
                            style={{
                                height: "8px",
                                borderRadius: "999px",
                                background:
                                    "rgba(255,255,255,0.08)",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    width: `${currentProgress}%`,
                                    height: "100%",
                                    background:
                                        "var(--teal)",
                                    transition:
                                        "width 0.3s ease",
                                }}
                            />
                        </div>
                    </div>
                )}

            {/* Manual resume */}
            {progressLoaded &&
                currentProgress > 0 &&
                currentProgress < 100 && (
                    <button
                        type="button"
                        onClick={
                            continueFromSavedProgress
                        }
                        style={{
                            marginBottom: "20px",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border:
                                "1px solid rgba(255,255,255,0.18)",
                            background:
                                "rgba(255,255,255,0.06)",
                            color: "inherit",
                            cursor: "pointer",
                        }}
                    >
                        Continue from saved progress
                    </button>
                )}

            {/* Sections */}
            {item.sections.map((section) => (
                <div
                    key={section.num}
                    data-module-section
                    data-section-number={section.num}
                >
                    <SectionBlock
                        section={section}
                    />
                </div>
            ))}

            {/* Key Takeaway */}
            <div className="takeaway-box">
                <h3>🔑 Key Takeaway</h3>
                <p>{item.keyTakeaway}</p>
            </div>

            {/* Completion / restart */}
            {currentProgress >= 100 && (
                <div
                    style={{
                        marginTop: "24px",
                        marginBottom: "24px",
                        padding: "16px",
                        borderRadius: "10px",
                        background:
                            "rgba(0, 229, 160, 0.08)",
                        border:
                            "1px solid rgba(0, 229, 160, 0.25)",
                    }}
                >
                    <strong>
                        Module completed
                    </strong>

                    <div
                        style={{
                            marginTop: "4px",
                            fontSize: "0.85rem",
                        }}
                    >
                        You can review this
                        module at any time.
                    </div>

                    <button
                        type="button"
                        onClick={restartModule}
                        disabled={restarting}
                        style={{
                            marginTop: "12px",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border:
                                "1px solid rgba(255,255,255,0.18)",
                            background:
                                "rgba(255,255,255,0.06)",
                            color: "inherit",
                            cursor: restarting
                                ? "not-allowed"
                                : "pointer",
                        }}
                    >
                        {restarting
                            ? "Restarting..."
                            : "Restart Module"}
                    </button>
                </div>
            )}

            {/* Prev / Next navigation */}
            <div className="module-nav">
                {item.prevId ? (
                    <Link
                        href={`${basePath}/${item.prevId}`}
                        className="nav-btn"
                    >
                        ← Previous
                    </Link>
                ) : (
                    <span />
                )}

                {item.nextId ? (
                    <Link
                        href={`${basePath}/${item.nextId}`}
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
        </main>
    );
}