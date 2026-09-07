"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import "./leaderboard.css";

interface LeaderboardEntry {
    rank: number;
    display_name: string;
    score: number;
    attempts: number;
    passed: boolean;
}

interface LeaderboardResponse {
    ok: boolean;
    quiz_id?: string;
    leaderboard?: LeaderboardEntry[];
    error?: string;
}

export default function LeaderboardPage() {
    const { user, loading } = useAuth();

    const [leaderboard, setLeaderboard] =
        useState<LeaderboardEntry[]>([]);

    const [loadingBoard, setLoadingBoard] =
        useState(true);

    const [error, setError] = useState("");

    useEffect(() => {
        if (loading) return;

        if (!user) {
            setLoadingBoard(false);
            return;
        }

        async function loadLeaderboard() {
            try {
                setLoadingBoard(true);
                setError("");

                const token =
                    await user!.getIdToken();

                const response = await fetch(
                    "/api/quizzes/leaderboard",
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const result: LeaderboardResponse =
                    await response.json();

                if (
                    !response.ok ||
                    !result.ok
                ) {
                    throw new Error(
                        result.error ||
                            "Failed to load leaderboard."
                    );
                }

                setLeaderboard(
                    result.leaderboard || []
                );
            } catch (err) {
                console.error(
                    "Leaderboard loading error:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load leaderboard."
                );
            } finally {
                setLoadingBoard(false);
            }
        }

        loadLeaderboard();
    }, [user, loading]);

    if (loading || loadingBoard) {
        return (
            <main className="main">
                <div className="leaderboard-page">
                    <div className="leaderboard-loading">
                        Loading leaderboard...
                    </div>
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="main">
                <div className="leaderboard-page">
                    <div className="leaderboard-empty">
                        <h1>
                            🏆 Student Leaderboard
                        </h1>

                        <p>
                            Please log in to view
                            the leaderboard.
                        </p>

                        <Link
                            href="/login"
                            className="leaderboard-button"
                        >
                            Login →
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="main">
            <div className="leaderboard-page">

                <div className="leaderboard-header">

                    <span className="leaderboard-badge">
                        🏆 Student Scores
                    </span>

                    <h1>
                        Hydrogen Safety
                        Leaderboard
                    </h1>

                    <p>
                        See how students are
                        performing in the
                        Hydrogen Hazards quiz.
                    </p>

                </div>

                {error && (
                    <div className="leaderboard-error">
                        {error}
                    </div>
                )}

                {!error &&
                    leaderboard.length ===
                        0 && (
                        <div className="leaderboard-empty">

                            <div className="empty-icon">
                                🏆
                            </div>

                            <h2>
                                No scores yet
                            </h2>

                            <p>
                                Be the first student
                                to share your quiz
                                score on the
                                leaderboard.
                            </p>

                            <Link
                                href="/quizzes/hazards"
                                className="leaderboard-button"
                            >
                                Take the Quiz →
                            </Link>

                        </div>
                    )}

                {leaderboard.length > 0 && (
                    <>

                        <div className="leaderboard-podium">

                            {leaderboard
                                .slice(0, 3)
                                .map((student) => (
                                    <div
                                        key={`${student.rank}-${student.display_name}`}
                                        className={`podium-card podium-${student.rank}`}
                                    >

                                        <div className="podium-rank">
                                            {student.rank ===
                                            1
                                                ? "🥇"
                                                : student.rank ===
                                                  2
                                                ? "🥈"
                                                : "🥉"}
                                        </div>

                                        <div className="podium-name">
                                            {
                                                student.display_name
                                            }
                                        </div>

                                        <div className="podium-score">
                                            {
                                                student.score
                                            }%
                                        </div>

                                        <div className="podium-attempts">
                                            {student.attempts}{" "}
                                            {student.attempts ===
                                            1
                                                ? "attempt"
                                                : "attempts"}
                                        </div>

                                    </div>
                                ))}

                        </div>

                        {leaderboard.length >
                            3 && (
                            <div className="leaderboard-list">

                                <div className="leaderboard-list-header">
                                    <span>
                                        Rank
                                    </span>

                                    <span>
                                        Student
                                    </span>

                                    <span>
                                        Score
                                    </span>

                                    <span>
                                        Attempts
                                    </span>
                                </div>

                                {leaderboard
                                    .slice(3)
                                    .map(
                                        (
                                            student
                                        ) => (
                                            <div
                                                key={`${student.rank}-${student.display_name}`}
                                                className="leaderboard-row"
                                            >

                                                <span className="rank-number">
                                                    #
                                                    {
                                                        student.rank
                                                    }
                                                </span>

                                                <span className="student-name">
                                                    {
                                                        student.display_name
                                                    }
                                                </span>

                                                <span className="student-score">
                                                    {
                                                        student.score
                                                    }%
                                                </span>

                                                <span className="student-attempts">
                                                    {
                                                        student.attempts
                                                    }
                                                </span>

                                            </div>
                                        )
                                    )}

                            </div>
                        )}

                    </>
                )}

                <div className="leaderboard-footer">

                    <Link
                        href="/quizzes"
                        className="leaderboard-secondary-button"
                    >
                        ← Back to Quizzes
                    </Link>

                    <Link
                        href="/quizzes/hazards"
                        className="leaderboard-button"
                    >
                        Take Quiz →
                    </Link>

                </div>

            </div>
        </main>
    );
}
