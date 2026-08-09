"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { modules } from "@/lib/modules";
import ModuleCard from "@/app/modules/components/ModuleCard";
import { useAuth } from "@/context/AuthContext";

interface Profile {
    uid: string;
    email?: string | null;
    display_name?: string | null;
    name?: string | null;
    role?: string | null;
    user_type?: string | null;
    organisation?: string | null;
}

interface ModuleProgress {
    uid: string;
    module_id: number | string;
    status?: string | null;
    progress?: number | null;
    time_spent?: number | string | null;
    started_at?: string | null;
    last_accessed?: string | null;
    completed_at?: string | null;
}

interface QuizProgress {
    uid: string;
    quiz_id: string;
    score?: number | null;
    attempts?: number | null;
    passed?: boolean | null;
    last_attempted_at?: string | null;
}

interface ProgressResponse {
    ok: boolean;
    error?: string;
    profile?: Profile;
    moduleProgress?: ModuleProgress[];
    quizProgress?: QuizProgress[];
    summary?: {
        totalModules: number;
        completedModules: number;
        overallProgress: number;
        quizAverage: number | null;
    };
}

export default function UserProgressPage() {
    const params = useParams();
    const uid = params.uid as string;

    const { user, loading: authLoading } = useAuth();

    const [data, setData] =
        useState<ProgressResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!user) {
            setError(
                "You must be logged in as an administrator."
            );
            setLoading(false);
            return;
        }

        async function loadProgress() {
            try {
                setLoading(true);
                setError("");

               if (!user) {
                  return;
                }

                const token =
                 await user.getIdToken();

                const response = await fetch(
                    `/api/admin/users/${uid}/progress`,
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const result: ProgressResponse =
                    await response.json();

                if (
                    !response.ok ||
                    !result.ok
                ) {
                    throw new Error(
                        result.error ||
                            "Failed to load user progress."
                    );
                }

                setData(result);
            } catch (err) {
                console.error(
                    "ADMIN PROGRESS LOAD ERROR:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load user progress."
                );
            } finally {
                setLoading(false);
            }
        }

        loadProgress();
    }, [user, authLoading, uid]);

    /*
     * ---------------------------------------------------------
     * Loading
     * ---------------------------------------------------------
     */

    if (authLoading || loading) {
        return (
            <main className="main">
                <div className="page-header">
                    <h1>Training Progress</h1>
                    <p>
                        Loading user progress...
                    </p>
                </div>
            </main>
        );
    }

    /*
     * ---------------------------------------------------------
     * Error
     * ---------------------------------------------------------
     */

    if (error) {
        return (
            <main className="main">
                <div className="page-header">
                    <h1>Training Progress</h1>

                    <p className="quiz-error">
                        {error}
                    </p>
                </div>

                <Link
                    href="/admin/users"
                    className="edit-btn"
                >
                    ← Back to Users
                </Link>
            </main>
        );
    }

    /*
     * ---------------------------------------------------------
     * No profile
     * ---------------------------------------------------------
     */

    if (!data?.profile) {
        return (
            <main className="main">
                <div className="page-header">
                    <h1>Training Progress</h1>

                    <p>
                        User profile could not be found.
                    </p>
                </div>

                <Link
                    href="/admin/users"
                    className="edit-btn"
                >
                    ← Back to Users
                </Link>
            </main>
        );
    }

    /*
     * ---------------------------------------------------------
     * Data
     * ---------------------------------------------------------
     */

    const profile = data.profile;

    const moduleProgress =
        data.moduleProgress ?? [];

    const quizProgress =
        data.quizProgress ?? [];

    const summary =
        data.summary ?? {
            totalModules: modules.length,
            completedModules: 0,
            overallProgress: 0,
            quizAverage: null,
        };

    /*
     * ---------------------------------------------------------
     * Match database progress with module definitions
     * ---------------------------------------------------------
     */

    const modulesWithProgress =
        modules.map((module) => {
            const savedProgress =
                moduleProgress.find(
                    (item) =>
                        String(item.module_id) ===
                        String(module.id)
                );

            if (!savedProgress) {
                return {
                    ...module,
                    status: "todo" as const,
                    progress: 0,
                    adminProgress: undefined,
                };
            }

            let status:
                | "done"
                | "progress"
                | "todo";

            const savedPercentage =
                Number(
                    savedProgress.progress ?? 0
                );

            if (
                savedProgress.status === "done" ||
                savedPercentage >= 100
            ) {
                status = "done";
            } else if (
                savedPercentage > 0 ||
                savedProgress.status === "progress"
            ) {
                status = "progress";
            } else {
                status = "todo";
            }

            return {
                ...module,

                status,

                progress: Math.max(
                    0,
                    Math.min(
                        100,
                        savedPercentage
                    )
                ),

                adminProgress:
                    savedProgress,
            };
        });

    /*
     * ---------------------------------------------------------
     * Certificate
     * ---------------------------------------------------------
     */

    const allModulesCompleted =
        summary.completedModules >=
        summary.totalModules;

    const certificateStatus =
        allModulesCompleted
            ? "Eligible"
            : "Pending";

    /*
     * ---------------------------------------------------------
     * User information
     * ---------------------------------------------------------
     */

    const displayName =
        profile.display_name ||
        profile.name ||
        profile.email ||
        "Unknown User";

    const role =
        profile.role || "User";

    const organisation =
        profile.organisation ||
        "Not provided";

    /*
     * ---------------------------------------------------------
     * Final quiz
     *
     * There is ONE final assessment for the training.
     * ---------------------------------------------------------
     */

    const finalQuiz =
        quizProgress.length > 0
            ? quizProgress[0]
            : null;

    /*
     * ---------------------------------------------------------
     * Page
     * ---------------------------------------------------------
     */

    return (
        <main className="main">

            {/* Header */}

            <div className="page-header">

                <h1>
                    Training Progress
                </h1>

                <p>
                    Viewing training record for user:
                    <strong>
                        {" "}
                        {uid}
                    </strong>
                </p>

            </div>

            {/* User Information */}

            <div className="panel">

                <div className="panel-header">
                    User Information
                </div>

                <div className="panel-body">

                    <p>
                        <strong>
                            Name:
                        </strong>{" "}
                        {displayName}
                    </p>

                    <p>
                        <strong>
                            Email:
                        </strong>{" "}
                        {profile.email ||
                            "Not provided"}
                    </p>

                    <p>
                        <strong>
                            Role:
                        </strong>{" "}
                        {role}
                    </p>

                    <p>
                        <strong>
                            Organisation:
                        </strong>{" "}
                        {organisation}
                    </p>

                </div>

            </div>

            <br />

            {/* Overall Progress */}

            <div className="panel">

                <div className="panel-header">
                    Overall Progress
                </div>

                <div className="panel-body">

                    <div className="progress-row">

                        <div className="progress-track">

                            <div
                                className="progress-fill"
                                style={{
                                    width:
                                        `${summary.overallProgress}%`,
                                }}
                            />

                        </div>

                        <div className="progress-pct">
                            {summary.overallProgress}%
                        </div>

                    </div>

                    <br />

                    <strong>
                        {summary.completedModules} of{" "}
                        {summary.totalModules} Modules
                        Completed
                    </strong>

                </div>

            </div>

            <br />

            {/* Training Modules */}

            <div className="page-header">

                <h2>
                    Hydrogen Safety Modules
                </h2>

                <p>
                    Administrator View
                    (Read Only)
                </p>

            </div>

            <div className="modules-grid">

                {modulesWithProgress.map(
                    (module, index) => (
                        <ModuleCard
                            key={module.id}
                            mod={module}
                            animationDelay={
                                index * 0.07
                            }
                            mode="admin"
                            adminProgress={
                                module.adminProgress
                            }
                        />
                    )
                )}

            </div>

            <br />

            {/* Final Assessment */}

            <div className="panel">

                <div className="panel-header">
                    Final Assessment
                </div>

                <div className="panel-body">

                    {finalQuiz ? (
                        <>

                            <p>
                                <strong>
                                    Quiz Score:
                                </strong>{" "}
                                {finalQuiz.score !==
                                    null &&
                                finalQuiz.score !==
                                    undefined
                                    ? `${finalQuiz.score}%`
                                    : "-"}
                            </p>

                            <p>
                                <strong>
                                    Attempts:
                                </strong>{" "}
                                {finalQuiz.attempts ??
                                    "-"}
                            </p>

                            <p>
                                <strong>
                                    Result:
                                </strong>{" "}
                                {finalQuiz.passed
                                    ? "Passed"
                                    : "Failed"}
                            </p>

                            <p>
                                <strong>
                                    Last Attempted:
                                </strong>{" "}

                                {finalQuiz.last_attempted_at
                                    ? new Date(
                                          finalQuiz.last_attempted_at
                                      ).toLocaleDateString(
                                          "en-AU",
                                          {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                          }
                                      )
                                    : "-"}
                            </p>

                        </>
                    ) : (
                        <p>
                            <strong>
                                Final Assessment:
                            </strong>{" "}
                            Not attempted
                        </p>
                    )}

                </div>

            </div>

            <br />

            {/* Certificate */}

            <div className="panel">

                <div className="panel-header">
                    Certificate
                </div>

                <div className="panel-body">

                    <p>
                        <strong>
                            Status:
                        </strong>{" "}
                        {certificateStatus}
                    </p>

                </div>

            </div>

            <br />

            {/* Back */}

            <Link
                href="/admin/users"
                className="edit-btn"
            >
                ← Back to Users
            </Link>

        </main>
    );
}