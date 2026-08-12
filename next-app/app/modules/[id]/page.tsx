"use client";

import "../modules.css";
import Link from "next/link";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import {
    useRouter,
    useParams,
} from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getModuleById } from "@/lib/modules";
import SectionBlock from "./components/SectionBlock";

type ProgressRecord = {
    module_id: string | number;
    progress?: number;
    status?: string | null;
    time_spent?: number | string | null;
};

type SaveRequest = {
    progress?: number;
    force?: boolean;
};

export default function ModulePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();

    const id = Array.isArray(params.id)
        ? params.id[0]
        : params.id;

    const mod = id
        ? getModuleById(id)
        : undefined;

    const [currentProgress, setCurrentProgress] =
        useState(0);

    const [progressLoaded, setProgressLoaded] =
        useState(false);

const [restarting, setRestarting] = useState(false);

    // ---------------------------------------------------------
    // Progress state
    // ---------------------------------------------------------

    const lastSavedProgress = useRef(0);

    const highestSectionReached =
        useRef(0);

    // ---------------------------------------------------------
    // Time state
    // ---------------------------------------------------------

    const savedTimeMinutes = useRef(0);

    const sessionStart =
        useRef<number | null>(null);

    const timeLoaded = useRef(false);

    // ---------------------------------------------------------
    // Save state
    // ---------------------------------------------------------

    const saving = useRef(false);

    const pendingSave =
        useRef<SaveRequest | null>(null);

    const cancelled =
        useRef(false);

    const persistRef =
        useRef<
            (request?: SaveRequest) => Promise<void>
        >(async () => {});

    // ---------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    // ---------------------------------------------------------
    // Invalid module
    // ---------------------------------------------------------

    useEffect(() => {
        if (
            !loading &&
            user &&
            id &&
            !mod
        ) {
            router.replace("/modules");
        }
    }, [
        loading,
        user,
        id,
        mod,
        router,
    ]);

    // ---------------------------------------------------------
    // Load progress + define single save path
    // ---------------------------------------------------------

    useEffect(() => {
        if (
            loading ||
            !user ||
            !mod
        ) {
            return;
        }

        const currentUser = user;
        const currentModule = mod;

        cancelled.current = false;

        async function persist(
            request: SaveRequest = {}
        ) {
            if (cancelled.current) {
                return;
            }

            if (
                !timeLoaded.current ||
                !sessionStart.current
            ) {
                return;
            }

            // Queue saves rather than losing them.
            if (saving.current) {
                const existing =
                    pendingSave.current;

                pendingSave.current = {
                    progress:
                        Math.max(
                            request.progress ?? 0,
                            existing?.progress ?? 0
                        ) || undefined,
                    force:
                        Boolean(
                            request.force ||
                            existing?.force
                        ),
                };

                return;
            }

            const force =
                request.force === true;

            const requestedProgress =
                request.progress;

            const elapsedSeconds =
                Math.floor(
                    (
                        Date.now() -
                        sessionStart.current
                    ) / 1000
                );

            const sessionMinutes = force
                ? Math.ceil(
                      elapsedSeconds / 60
                  )
                : Math.floor(
                      elapsedSeconds / 60
                  );

            const totalMinutes =
                savedTimeMinutes.current +
                sessionMinutes;

            /*
             * Never reduce saved progress.
             * This is important when a learner
             * reopens a completed module.
             */
            const nextProgress =
                requestedProgress !==
                undefined
                    ? Math.max(
                          requestedProgress,
                          lastSavedProgress.current
                      )
                    : lastSavedProgress.current;

            const progressChanged =
                nextProgress >
                lastSavedProgress.current;

            const timeChanged =
                totalMinutes >
                savedTimeMinutes.current;

            if (
                !force &&
                !progressChanged &&
                !timeChanged
            ) {
                return;
            }

            saving.current = true;

            try {
                const token =
                    await currentUser.getIdToken();

                const response =
                    await fetch(
                        "/api/modules/progress",
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                Authorization:
                                    `Bearer ${token}`,
                            },
                            body:
                                JSON.stringify({
                                    module_id:
                                        currentModule.id,
                                    progress:
                                        nextProgress,
                                    time_spent:
                                        totalMinutes,
                                }),
                            keepalive:
                                force,
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.ok
                ) {
                    console.error(
                        "Failed to save module progress:",
                        result.error
                    );

                    return;
                }

                savedTimeMinutes.current =
                    totalMinutes;

                lastSavedProgress.current =
                    nextProgress;

                sessionStart.current =
                    Date.now();

                setCurrentProgress(
                    nextProgress
                );
            } catch (error) {
                console.error(
                    "Failed to save module progress:",
                    error
                );
            } finally {
                saving.current = false;

                if (
                    pendingSave.current
                ) {
                    const next =
                        pendingSave.current;

                    pendingSave.current =
                        null;

                    void persist(next);
                }
            }
        }

        persistRef.current =
            persist;

        async function loadProgress() {
            try {
                const token =
                    await currentUser.getIdToken();

                // Create the record if it does not exist.
                const startResponse =
                    await fetch(
                        "/api/modules/progress",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                Authorization:
                                    `Bearer ${token}`,
                            },
                            body:
                                JSON.stringify({
                                    module_id:
                                        currentModule.id,
                                }),
                        }
                    );

                const startResult =
                    await startResponse.json();

                if (
                    !startResponse.ok ||
                    !startResult.ok
                ) {
                    throw new Error(
                        startResult.error ||
                            "Failed to initialise module progress."
                    );
                }

                // Load the user's existing records.
                const response =
                    await fetch(
                        "/api/modules/progress",
                        {
                            method: "GET",
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                            cache: "no-store",
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.ok
                ) {
                    throw new Error(
                        result.error ||
                            "Failed to load module progress."
                    );
                }

                const record:
                    | ProgressRecord
                    | undefined =
                    Array.isArray(
                        result.progress
                    )
                        ? result.progress.find(
                              (
                                  item: ProgressRecord
                              ) =>
                                  String(
                                      item.module_id
                                  ) ===
                                  String(
                                      currentModule.id
                                  )
                          )
                        : undefined;

                if (record) {
                    const savedProgress =
                        Math.max(
                            0,
                            Math.min(
                                100,
                                Number(
                                    record.progress ??
                                        0
                                )
                            )
                        );

                    const previousTime =
                        Math.max(
                            0,
                            Number(
                                record.time_spent ??
                                    0
                            )
                        );

                    setCurrentProgress(
                        savedProgress
                    );

                    lastSavedProgress.current =
                        savedProgress;

                    savedTimeMinutes.current =
                        Number.isFinite(
                            previousTime
                        )
                            ? previousTime
                            : 0;

                    highestSectionReached.current =
                        Math.min(
                            currentModule
                                .sections.length,
                            Math.ceil(
                                (
                                    savedProgress /
                                    100
                                ) *
                                currentModule
                                    .sections
                                    .length
                            )
                        );
                } else {
                    setCurrentProgress(0);

                    lastSavedProgress.current =
                        0;

                    highestSectionReached.current =
                        0;

                    savedTimeMinutes.current =
                        0;
                }

                timeLoaded.current =
                    true;

                sessionStart.current =
                    Date.now();
            } catch (error) {
                console.error(
                    "Failed to load module progress:",
                    error
                );

                timeLoaded.current =
                    false;
            } finally {
                /*
                 * The observer and resume logic
                 * are allowed to start only after
                 * this initial database load.
                 */
                setProgressLoaded(true);
            }
        }

        void loadProgress();

        // -----------------------------------------------------
        // Periodic time save
        // -----------------------------------------------------

        const interval =
            window.setInterval(() => {
                void persistRef.current();
            }, 15000);

        // -----------------------------------------------------
        // Visibility save
        // -----------------------------------------------------

        const handleVisibilityChange =
            () => {
                if (
                    document.visibilityState ===
                    "hidden"
                ) {
                    void persistRef.current({
                        force: true,
                    });
                } else {
                    sessionStart.current =
                        Date.now();
                }
            };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        // -----------------------------------------------------
        // Page hide save
        // -----------------------------------------------------

        const handlePageHide = () => {
            void persistRef.current({
                force: true,
            });
        };

        window.addEventListener(
            "pagehide",
            handlePageHide
        );

        return () => {
            /*
             * Perform the final save before
             * marking the effect as cancelled.
             */
            void persist({
                force: true,
            });

            cancelled.current = true;

            window.clearInterval(
                interval
            );

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            window.removeEventListener(
                "pagehide",
                handlePageHide
            );
        };
    }, [
        loading,
        user,
        mod,
    ]);



    // ---------------------------------------------------------
    // Section progress tracking
    // ---------------------------------------------------------

    useEffect(() => {
        if (
            loading ||
            !user ||
            !mod ||
            !progressLoaded
        ) {
            return;
        }

        const currentModule = mod;

        const sectionElements =
            document.querySelectorAll<HTMLElement>(
                "[data-module-section]"
            );

        if (
            sectionElements.length === 0
        ) {
            return;
        }

        const totalSections =
            currentModule.sections.length;

        const handleSectionVisible =
            (sectionNumber: number) => {
                if (
                    sectionNumber <=
                    highestSectionReached.current
                ) {
                    /*
                     * Already reached this
                     * section, so there is
                     * nothing new to save.
                     */
                    return;
                }

                highestSectionReached.current =
                    Math.max(
                        highestSectionReached.current,
                        sectionNumber
                    );

                const progress =
                    sectionNumber >=
                    totalSections
                        ? 100
                        : Math.min(
                              99,
                              Math.round(
                                  (
                                      highestSectionReached
                                          .current /
                                      totalSections
                                  ) *
                                  100
                              )
                          );

                /*
                 * Never decrease a learner's
                 * stored progress.
                 */
                if (
                    progress <=
                    lastSavedProgress.current
                ) {
                    return;
                }

                void persistRef.current({
                    progress,
                });
            };

        const observer =
            new IntersectionObserver(
                (entries) => {
                    entries.forEach(
                        (entry) => {
                            if (
                                !entry.isIntersecting
                            ) {
                                return;
                            }

                            const sectionNumber =
                                Number(
                                    entry.target.getAttribute(
                                        "data-section-number"
                                    )
                                );

                            if (
                                sectionNumber > 0
                            ) {
                                handleSectionVisible(
                                    sectionNumber
                                );
                            }
                        }
                    );
                },
                {
                    threshold: 0.1,
                }
            );

        sectionElements.forEach(
            (section) => {
                observer.observe(section);
            }
        );

        return () => {
            observer.disconnect();
        };
    }, [
        loading,
        user,
        mod,
        progressLoaded,
    ]);


    // ---------------------------------------------------------
    // Manual resume
    // ---------------------------------------------------------

    const continueFromSavedProgress = () => {
        if (
            !mod ||
            currentProgress <= 0 ||
            currentProgress >= 100
        ) {
            return;
        }

        const totalSections =
            mod.sections.length;

        if (totalSections <= 0) {
            return;
        }

        const resumeSection =
            Math.min(
                totalSections,
                Math.max(
                    1,
                    Math.ceil(
                        (currentProgress / 100) *
                            totalSections
                    )
                )
            );

        const sections =
            document.querySelectorAll<HTMLElement>(
                "[data-module-section]"
            );

        const target =
            sections[resumeSection - 1];

        if (!target) {
            return;
        }

        target.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };
    // ---------------------------------------------------------
    
    // ---------------------------------------------------------
    // Restart completed module
    // ---------------------------------------------------------

    const restartModule = async () => {
        if (
            !mod ||
            currentProgress < 100 ||
            restarting
        ) {
            return;
        }

        const confirmed = window.confirm(
            "Restart this module?\n\n" +
            "Your current progress will be reset " +
            "and this will count as a new attempt."
        );

        if (!confirmed) {
            return;
        }

        setRestarting(true);

        try {
            const token = await user?.getIdToken();

            if (!token) {
                throw new Error(
                    "Authentication token is unavailable."
                );
            }

            const response = await fetch(
                "/api/modules/progress",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        module_id: mod.id,
                        action: "restart",
                    }),
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.ok
            ) {
                throw new Error(
                    result.error ||
                        "Failed to restart module."
                );
            }

            // Reset local progress state.
            setCurrentProgress(0);

            lastSavedProgress.current = 0;
            highestSectionReached.current = 0;

            savedTimeMinutes.current = 0;
            sessionStart.current = Date.now();

            // Start again from the top.
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });

        } catch (error) {
            console.error(
                "Failed to restart module:",
                error
            );

            window.alert(
                error instanceof Error
                    ? error.message
                    : "Failed to restart module."
            );
        } finally {
            setRestarting(false);
        }
    };
// Loading / guards
    // ---------------------------------------------------------

    if (loading) {
        return (
            <div>
                Loading...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (!mod) {
        return null;
    }

    // ---------------------------------------------------------
    // Page
    // ---------------------------------------------------------

    return (
        <main
            className="main"
            style={{
                maxWidth: "820px",
            }}
        >
            {/* Breadcrumb */}

            <div className="back-crumb">
                <Link href="/modules">
                    ← Modules
                </Link>

                {" / "} Hazard{" "}
                {mod.hazardNum} –{" "}
                {mod.title}
            </div>

            {/* Hero */}

            <div className="module-hero">
                <div
                    className="module-icon-big"
                    style={{
                        background:
                            mod.iconBg,
                    }}
                >
                    {mod.icon}
                </div>

                <div className="module-hero-text">
                    <div className="hazard-label">
                        Hazard{" "}
                        {mod.hazardNum}
                    </div>

                    <h1>{mod.title}</h1>

                    <p>
                        Read through all
                        sections to complete
                        this module. Then test
                        your knowledge in the
                        Quizzes.
                    </p>
                </div>
            </div>

            {/* Completed banner */}

            {currentProgress >= 100 && (
                <div
                    style={{
                        marginBottom: "20px",
                        padding: "12px 16px",
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
                            fontSize:
                                "0.85rem",
                        }}
                    >
                        You can review this
                        module at any time.
                    </div>                    <div
                        style={{
                            marginTop: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "0.8rem",
                                opacity: 0.75,
                            }}
                        >
                            Need to complete it again?
                        </span>

                        <button
                            type="button"
                            onClick={restartModule}
                            disabled={restarting}
                            style={{
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
                                fontWeight: 600,
                                opacity: restarting
                                    ? 0.6
                                    : 1,
                            }}
                        >
                            {restarting
                                ? "Restarting..."
                                : "Restart Module"}
                        </button>
                    </div>
                </div>
            )}

            {/* Current progress */}

            {currentProgress > 0 && (
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
                            fontSize:
                                "0.85rem",
                        }}
                    >
                        <span>
                            Module Progress
                        </span>

                        <strong>
                            {currentProgress}%
                        </strong>
                    </div>
<div
                        style={{
                            height: "6px",
                            borderRadius: "10px",
                            background:
                                "rgba(255,255,255,0.08)",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width:
                                    `${currentProgress}%`,
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

            {/* Sections */}

            {mod.sections.map(
                (section) => (
                    <div
                        key={section.num}
                        data-module-section
                        data-section-number={
                            section.num
                        }
                    >
                        <SectionBlock
                            section={
                                section
                            }
                        />
                    </div>
                )
            )}

            {/* Key Takeaway */}

            <div className="takeaway-box">
                <h3>
                    Key Takeaway
                </h3>

                <p>
                    {mod.keyTakeaway}
                </p>
            </div>

            {/* Previous / Next navigation */}

            <div className="module-nav">
                {mod.prevId ? (
                    <Link
                        href={`/modules/${mod.prevId}`}
                        className="nav-btn"
                    >
                        ← Previous
                    </Link>
                ) : (
                    <span />
                )}

                {mod.nextId ? (
                    <Link
                        href={`/modules/${mod.nextId}`}
                        className="nav-btn teal"
                    >
                        Next Module →
                    </Link>
                ) : (
                    <Link
                        href="/modules"
                        className="nav-btn teal"
                    >
                        Back to Modules
                    </Link>
                )}
            </div>
        </main>
    );
}





