// hooks/useModuleProgress.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

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

interface UseModuleProgressProps {
    moduleId: string;
    section: string;
    sectionCount: number;
    user: User | null;
    loading: boolean;
}

interface UseModuleProgressResult {
    currentProgress: number;
    progressLoaded: boolean;
    restarting: boolean;
    continueFromSavedProgress: () => void;
    restartModule: () => Promise<void>;
}

export function useModuleProgress({
    moduleId,
    section,
    sectionCount,
    user,
    loading,
}: UseModuleProgressProps): UseModuleProgressResult {
    const [currentProgress, setCurrentProgress] = useState(0);
    const [progressLoaded, setProgressLoaded] = useState(false);
    const [restarting, setRestarting] = useState(false);

    // ---------------------------------------------------------
    // Progress state
    // ---------------------------------------------------------

    const lastSavedProgress = useRef(0);
    const highestSectionReached = useRef(0);
    const restartPendingRef = useRef(false);

    // ---------------------------------------------------------
    // Time state
    // ---------------------------------------------------------

    const savedTimeMinutes = useRef(0);
    const sessionStart = useRef<number | null>(null);
    const timeLoaded = useRef(false);

    // ---------------------------------------------------------
    // Save state
    // ---------------------------------------------------------

    const saving = useRef(false);
    const pendingSave = useRef<SaveRequest | null>(null);
    const cancelled = useRef(false);

    const persistRef = useRef<
        (request?: SaveRequest) => Promise<void>
    >(async () => {});

    // ---------------------------------------------------------
    // Reset when module changes
    // ---------------------------------------------------------

    useEffect(() => {
        setCurrentProgress(0);
        setProgressLoaded(false);
        setRestarting(false);

        lastSavedProgress.current = 0;
        highestSectionReached.current = 0;

        savedTimeMinutes.current = 0;
        sessionStart.current = null;
        timeLoaded.current = false;

        saving.current = false;
        pendingSave.current = null;
        cancelled.current = false;
    }, [moduleId]);

    // ---------------------------------------------------------
    // Load progress + initialise module record
    // ---------------------------------------------------------

    useEffect(() => {
        if (loading || !user || !moduleId || sectionCount <= 0) {
            return;
        }

        const currentUser = user;
        const currentModuleId = moduleId;
        const currentSection = section;

        cancelled.current = false;

        async function loadProgress() {
            try {
                const token = await currentUser.getIdToken();

                // Create progress record if it does not exist.
                const startResponse = await fetch("/api/modules/progress",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            module_id: currentModuleId,
                            section: currentSection,
                        }),
                    }
                );

                const startResult = await startResponse.json();

                if (!startResponse.ok || !startResult.ok) {
                    throw new Error(
                        startResult.error || "Failed to initialise module progress."
                    );
                }

                // Load all progress records for the user, scoped to section.
                const response = await fetch(
                    `/api/modules/progress?section=${encodeURIComponent(currentSection)}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.ok) {
                    throw new Error(
                        result.error || "Failed to load module progress."
                    );
                }

                const record: | ProgressRecord | undefined = Array.isArray(result.progress)
                    ? result.progress.find(
                        (item: ProgressRecord) => String(item.module_id) === String(currentModuleId)
                    ) : undefined;

                if (record) {
                    const savedProgress = Math.max(0,Math.min(100, Number(record.progress ?? 0)));
                    const previousTime = Math.max(0, Number(record.time_spent ?? 0));

                    setCurrentProgress(Number.isFinite(savedProgress)
                        ? savedProgress : 0
                    );

                    lastSavedProgress.current = Number.isFinite(savedProgress)
                        ? savedProgress : 0;

                    savedTimeMinutes.current = Number.isFinite(previousTime)
                        ? previousTime : 0;

                    highestSectionReached.current = Math.min(sectionCount,
                        Math.ceil(
                            ((Number.isFinite(savedProgress) ? savedProgress : 0) / 100) * sectionCount
                        )
                    );
                } else {
                    setCurrentProgress(0);
                    lastSavedProgress.current = 0;
                    highestSectionReached.current = 0;
                    savedTimeMinutes.current = 0;
                }

                timeLoaded.current = true;
                sessionStart.current = Date.now();
            } catch (error) {
                console.error(
                    "Failed to load module progress:",
                    error
                );

                timeLoaded.current = false;
            } finally {
                setProgressLoaded(true);
            }
        }

        void loadProgress();

        // -----------------------------------------------------
        // Periodic time save
        // -----------------------------------------------------

        const interval = window.setInterval(() => {
            void persistRef.current();
        }, 15000);

        // -----------------------------------------------------
        // Visibility save
        // -----------------------------------------------------

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                void persistRef.current({ force: true, });
            } else if (timeLoaded.current) {
                sessionStart.current = Date.now();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // -----------------------------------------------------
        // Page hide save
        // -----------------------------------------------------

        const handlePageHide = () => {
            void persistRef.current({ force: true, });
        };

        window.addEventListener("pagehide", handlePageHide);

        return () => {
            void persistRef.current({ force: true, });
            cancelled.current = true;
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handlePageHide);
        };
    }, [
        loading,
        user,
        moduleId,
        section,
        sectionCount,
    ]);

    // ---------------------------------------------------------
    // Persist progress/time
    // ---------------------------------------------------------

    useEffect(() => {
        if (loading || !user || !moduleId) {
            return;
        }

        const currentUser = user;
        const currentModuleId = moduleId;
        const currentSection = section;

        async function persist(request: SaveRequest = {}) {
            if (cancelled.current) {
                return;
            }

            if (!timeLoaded.current || !sessionStart.current) {
                return;
            }

            // Queue saves rather than losing them.
            if (saving.current) {
                const existing = pendingSave.current;

                pendingSave.current = {
                    progress: Math.max(request.progress ?? 0, existing?.progress ?? 0) || undefined,
                    force: Boolean(request.force || existing?.force),
                };

                return;
            }

            const force = request.force === true;
            const requestedProgress = request.progress;
            const elapsedSeconds = Math.floor((Date.now() - sessionStart.current) / 1000);

            const sessionMinutes = force
                ? Math.ceil(elapsedSeconds / 60)
                : Math.floor(elapsedSeconds / 60);

            const totalMinutes = savedTimeMinutes.current + sessionMinutes;

            /*
             * Never reduce saved progress.
             * This is important when a learner reopens a completed module.
             */
            const nextProgress = requestedProgress !== undefined
                ? Math.max(requestedProgress, lastSavedProgress.current)
                : lastSavedProgress.current;

            const progressChanged = nextProgress > lastSavedProgress.current;
            const timeChanged = totalMinutes > savedTimeMinutes.current;

            if (!force && !progressChanged && !timeChanged) {
                return;
            }

            saving.current = true;

            try {
                const token = await currentUser.getIdToken();

                const response = await fetch("/api/modules/progress", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        module_id: currentModuleId,
                        section: currentSection,
                        progress: nextProgress,
                        time_spent: totalMinutes,
                    }),
                    keepalive: force,
                });

                const result = await response.json();

                if (!response.ok || !result.ok) {
                    console.error(
                        "Failed to save module progress:",
                        result.error
                    );

                    return;
                }

                savedTimeMinutes.current = totalMinutes;
                lastSavedProgress.current = nextProgress;
                sessionStart.current = Date.now();
                setCurrentProgress(nextProgress);
            } catch (error) {
                console.error(
                    "Failed to save module progress:",
                    error
                );
            } finally {
                saving.current = false;

                if (pendingSave.current) {
                    const next = pendingSave.current;
                    pendingSave.current = null;
                    void persist(next);
                }
            }
        }

        persistRef.current = persist;
    }, [loading, user, moduleId, section]);

    // ---------------------------------------------------------
    // Section progress tracking
    // ---------------------------------------------------------
    useEffect(() => {
        if (loading || !user || !moduleId || !progressLoaded || sectionCount <= 0) {
            return;
        }

        const sectionElements = document.querySelectorAll<HTMLElement>("[data-module-section]");

        if (sectionElements.length === 0) {
            return;
        }

        const handleSectionVisible = (sectionNumber: number) => {
            if (restartPendingRef.current) {
                if (window.scrollY <= 20) {
                    return;
                }
                restartPendingRef.current = false;
            }
            if (sectionNumber <= 0 || sectionNumber > sectionCount) {
                return;
            }

            /*
             * Only allow the next section to advance progress.
             * This prevents IntersectionObserver from reporting later sections during initial page layout and incorrectly jumping progress forward.
             */
            const nextSection = highestSectionReached.current + 1;

            if (sectionNumber !== nextSection) {
                return;
            }

            highestSectionReached.current = sectionNumber;

            const progress = sectionNumber >= sectionCount
                ? 100
                : Math.min(99, Math.round((sectionNumber / sectionCount) * 100));

            if (progress <= lastSavedProgress.current) {
                return;
            }

            void persistRef.current({ progress, });
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const sectionNumber = Number(entry.target.getAttribute("data-section-number"));
                handleSectionVisible(sectionNumber);
            });
        },
        {
            threshold: 0.5,
        });

        sectionElements.forEach((section) => {
            observer.observe(section);
        });

        return () => {
            observer.disconnect();
        };
    }, [
        loading,
        user,
        moduleId,
        sectionCount,
        progressLoaded,
    ]);

    // ---------------------------------------------------------
    // Manual resume
    // ---------------------------------------------------------

    const continueFromSavedProgress = useCallback(() => {
        if (currentProgress <= 0 || currentProgress >= 100 || sectionCount <= 0) {
            return;
        }

        const resumeSection = Math.min(sectionCount,
            Math.max(1,
                Math.ceil((currentProgress / 100) * sectionCount)));

        const sections = document.querySelectorAll<HTMLElement>("[data-module-section]");

        const target = sections[resumeSection - 1];

        if (!target) {
            return;
        }

        target.scrollIntoView({
            behavior: "auto",
            block: "start",
        });
    }, [
        currentProgress,
        sectionCount,
    ]);

    // ---------------------------------------------------------
    // Restart completed module
    // ---------------------------------------------------------

    const restartModule = useCallback(async () => {
        if (!moduleId || currentProgress < 100 || restarting) {
            return;
        }

        const confirmed = window.confirm(
            "Restart this module?\n\n"
            + "Your current progress will be reset and this will count as a new attempt."
        );

        if (!confirmed) {
            return;
        }

        setRestarting(true);

        try {
            const token = await user?.getIdToken();

            if (!token) {
                throw new Error("Authentication token is unavailable.");
            }

            const response = await fetch("/api/modules/progress", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    module_id: moduleId,
                    section: section,
                    action: "restart",
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(
                    result.error || "Failed to restart module."
                );
            }

            // Reset local progress state.
            setCurrentProgress(0);

            lastSavedProgress.current = 0;
            highestSectionReached.current = 0;
            restartPendingRef.current = true;

            savedTimeMinutes.current = 0;
            sessionStart.current = Date.now();

            // Start again from the top.
            window.scrollTo({
                top: 0,
                behavior: "auto",
            });
        } catch (error) {
            console.error(
                "Failed to restart module:",
                error
            );
        } finally {
            setRestarting(false);
        }
    }, [
        user,
        moduleId,
        section,
        currentProgress,
        restarting,
    ]);

    return {
        currentProgress,
        progressLoaded,
        restarting,
        continueFromSavedProgress,
        restartModule,
    };
}
