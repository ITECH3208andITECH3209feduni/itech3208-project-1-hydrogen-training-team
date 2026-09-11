"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "../quizzes/quizzes.css";

export default function AdminPage() {
    const { loading, profile, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!profile || !isAdmin)) {
            router.replace("/dashboard");
        }
    }, [loading, profile, isAdmin, router]);

    if (loading || !profile || !isAdmin) {
        return null;
    }

    return (
        <main className="main">
            <div className="page-header">
                <h1>Admin Tools</h1>
                <p>
                    Manage user access, learner progress and feedback.
                </p>
            </div>

            <div className="quizzes-grid">
                <Link
                    href="/admin/users"
                    className="quiz-card"
                >
                    <div
                        className="quiz-card-icon"
                        style={{
                            background: "rgba(0, 180, 216, 0.12)",
                        }}
                    >
                        👥
                    </div>

                    <div className="quiz-card-body">
                        <div className="quiz-card-title">
                            User Management
                        </div>

                        <div className="quiz-card-desc">
                            Manage users, roles and learner progress.
                        </div>
                    </div>

                    <div className="quiz-card-link">
                        Manage Users →
                    </div>
                </Link>

                <Link
                    href="/admin/feedback"
                    className="quiz-card"
                >
                    <div
                        className="quiz-card-icon"
                        style={{
                            background: "rgba(0, 180, 216, 0.12)",
                        }}
                    >
                        💬
                    </div>

                    <div className="quiz-card-body">
                        <div className="quiz-card-title">
                            Learner Feedback
                        </div>

                        <div className="quiz-card-desc">
                            Review learner ratings, comments and feedback
                            from the training experience.
                        </div>
                    </div>

                    <div className="quiz-card-link">
                        View Feedback →
                    </div>
                </Link>
            </div>
        </main>
    );
}