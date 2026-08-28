// app/dashboard/page.tsx - Hydrogen Lab Safety Dashboard

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useModules } from "@/hooks/useModules";
import { hazardModules } from "@/lib/hazardModules";
import "./dashboard.css";

type QuizProgress = {
    score: number;
    passed: boolean;
    attempts: number;
    last_attempted_at?: string | null;
};

export default function Dashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const {
        modules,
        loadStatus,
    } = useModules("hazard-modules", hazardModules);

    const [quizProgress, setQuizProgress] =
        useState<QuizProgress | null>(null);

    const [quizLoading, setQuizLoading] =
        useState(true);

    // Redirect unauthenticated users
    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);

    // Load user's quiz progress
    useEffect(() => {
        async function loadQuizProgress() {
            try {
                setQuizLoading(true);

                if (!user) {
                    setQuizProgress(null);
                    return;
                }

                const token = await user.getIdToken();

                const response = await fetch(
                    "/api/quizzes/progress",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const data = await response.json();

                if (
                    response.ok &&
                    data.ok &&
                    data.progress
                ) {
                    setQuizProgress({
                        score: Number(
                            data.progress.score ?? 0
                        ),
                        passed: Boolean(
                            data.progress.passed
                        ),
                        attempts: Number(
                            data.progress.attempts ?? 0
                        ),
                        last_attempted_at:
                            data.progress
                                .last_attempted_at ?? null,
                    });
                } else {
                    setQuizProgress(null);
                }
            } catch (error) {
                console.error(
                    "Failed to load dashboard quiz progress:",
                    error
                );

                setQuizProgress(null);
            } finally {
                setQuizLoading(false);
            }
        }

        if (!loading) {
            loadQuizProgress();
        }
    }, [user, loading]);

    // Module statistics
    const totalModules = modules.length;

    const completedModules = useMemo(
        () =>
            modules.filter(
                (module) =>
                    module.status === "done" ||
                    Number(module.progress) >= 100
            ).length,
        [modules]
    );

    const inProgressModules = useMemo(
        () =>
            modules.filter(
                (module) =>
                    Number(module.progress) > 0 &&
                    Number(module.progress) < 100
            ).length,
        [modules]
    );

    // Certificate eligibility
    const allModulesCompleted =
        totalModules > 0 &&
        completedModules === totalModules;

    const certificateEligible =
        allModulesCompleted &&
        !!quizProgress &&
        quizProgress.score >= 70;

    // Training topics
    const trainingTopics = useMemo(
        () =>
            modules.map((module) => ({
                id: module.id,
                title: module.title,
            })),
        [modules]
    );

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <main className="main">

            {/* User Greeting */}
            <div className="greeting">
                <h1>
                    Welcome back,
                    <span className="greeting-accent">
                        {" "}
                        {user.displayName || user.email}
                    </span>{" "}
                    &#128075;
                </h1>

                <p>
                    Continue your hydrogen technology
                    training journey
                </p>
            </div>

            {/* Top Stat Cards */}
            <div className="stat-cards">

                {/* Modules */}
                <Link
                    href="/modules/hazard-modules"
                    className="stat-card"
                >
                    <div className="stat-icon modules">
                        &#128218;
                    </div>

                    <div className="stat-info">
                        <div className="label">
                            Modules
                        </div>

                        <div className="count">
                            {loadStatus === "loading"
                                ? "—"
                                : totalModules}
                        </div>

                        <div className="sub">
                            {loadStatus === "loading"
                                ? "Loading..."
                                : `${completedModules} completed · ${inProgressModules} in progress`}
                        </div>
                    </div>

                    <div className="stat-arrow">
                        →
                    </div>
                </Link>

                {/* Scenarios - static for now */}
                <Link
                    href="/lab"
                    className="stat-card"
                >
                    <div className="stat-icon scenarios">
                        &#128300;
                    </div>

                    <div className="stat-info">
                        <div className="label">
                            Scenarios / Simulation
                        </div>

                        <div className="count">
                            8
                        </div>

                        <div className="sub">
                            2 completed · 1 in progress
                        </div>
                    </div>

                    <div className="stat-arrow">
                        →
                    </div>
                </Link>

                {/* Quizzes */}
                <Link
                    href="/quizzes"
                    className="stat-card"
                >
                    <div className="stat-icon quizzes">
                        &#128221;
                    </div>

                    <div className="stat-info">
                        <div className="label">
                            Quizzes
                        </div>

                        <div className="count">
                            {quizLoading
                                ? "—"
                                : quizProgress
                                    ? `${quizProgress.score}%`
                                    : "—"}
                        </div>

                        <div className="sub">
                            {quizLoading
                                ? "Loading..."
                                : quizProgress
                                    ? quizProgress.passed
                                        ? "Passed · Final Quiz"
                                        : `${quizProgress.attempts} attempt${quizProgress.attempts === 1 ? "" : "s"}`
                                    : "Not attempted"}
                        </div>
                    </div>

                    <div className="stat-arrow">
                        →
                    </div>
                </Link>
            </div>

            {/* Lower Dashboard Panels */}
            <div className="dashboard-lower-grid">

                {/* Training Topics */}
                <section className="dashboard-panel topics-panel">

                    <div className="panel-header">
                        <div className="panel-title">
                            <span className="panel-title-icon">
                                &#128218;
                            </span>

                            <h2>
                                Training Topics
                            </h2>
                        </div>

                        <Link
                            href="/modules/hazard-modules"
                            className="panel-link"
                        >
                            View Modules →
                        </Link>
                    </div>

                    <div className="topic-list">

                        {trainingTopics.length > 0 ? (
                            trainingTopics.map(
                                (topic, index) => (
                                    <Link
                                        key={topic.id}
                                        href={`/modules/hazard-modules/${topic.id}`}
                                        className="topic-item"
                                    >
                                        <span className="topic-number">
                                            {String(
                                                index + 1
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </span>

                                        <span className="topic-divider" />

                                        <span className="topic-title">
                                            {topic.title}
                                        </span>

                                        <span className="topic-arrow">
                                            →
                                        </span>
                                    </Link>
                                )
                            )
                        ) : (
                            <div className="topics-loading">
                                Training topics are loading...
                            </div>
                        )}

                    </div>

                    <div className="topics-footer">
                        <Link
                            href="/modules/hazard-modules"
                        >
                            View all modules →
                        </Link>
                    </div>

                </section>

                {/* Completed Modules / Certification */}
                <section className="dashboard-panel certificate-panel">

                    <div className="panel-header">
                        <div className="panel-title">
                            <span className="panel-title-icon">
                                &#127942;
                            </span>

                            <h2>
                                Completed Modules
                            </h2>
                        </div>
                    </div>

                    <div className="certificate-content">

                        <div className="certificate-icon">
                            &#127891;
                        </div>

                        <div className="certificate-text">
                            <h3>
                                Hydrogen Safety
                                Certification
                            </h3>

                            {certificateEligible ? (
                                <p>
                                    Congratulations! You
                                    have completed all
                                    required training
                                    modules and passed
                                    the final quiz.
                                </p>
                            ) : (
                                <p>
                                    Complete all required
                                    training modules and
                                    pass the final quiz
                                    with a score of 70%
                                    or higher to unlock
                                    your certificate.
                                </p>
                            )}
                        </div>

                        <Link
                            href="/certificate"
                            className="btn-cert"
                        >
                            {certificateEligible
                                ? "View Certificate →"
                                : "Check Eligibility →"}
                        </Link>

                    </div>

                </section>

            </div>

        </main>
    );
}