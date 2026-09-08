"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import "./feedback.css";

type FeedbackItem = {
    id: number;
    user_id: string;
    email: string;
    rating: number;
    category: string;
    message: string;
    created_at: string;
};

export default function AdminFeedbackPage() {
    const { user, loading, profile, isAdmin } = useAuth();
    const router = useRouter();

    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loadingFeedback, setLoadingFeedback] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && (!profile || !isAdmin)) {
            router.replace("/dashboard");
        }
    }, [loading, profile, isAdmin, router]);

    useEffect(() => {
        async function loadFeedback() {
            if (!user || !isAdmin) {
                return;
            }

            try {
                setLoadingFeedback(true);
                setError("");

                const token = await user.getIdToken();

                const response = await fetch(
                    "/api/admin/feedback",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error(
                        data.error ||
                        "Unable to load feedback."
                    );
                }

                setFeedback(data.feedback ?? []);

            } catch (loadError) {
                console.error(
                    "Failed to load admin feedback:",
                    loadError
                );

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Unable to load feedback."
                );
            } finally {
                setLoadingFeedback(false);
            }
        }

        if (!loading) {
            loadFeedback();
        }
    }, [user, loading, isAdmin]);

    const totalResponses = feedback.length;

    const averageRating = useMemo(() => {
        if (!feedback.length) {
            return 0;
        }

        const total = feedback.reduce(
            (sum, item) => sum + item.rating,
            0
        );

        return total / feedback.length;
    }, [feedback]);

    const ratingCounts = useMemo(() => {
        return [5, 4, 3, 2, 1].map((rating) => ({
            rating,
            count: feedback.filter(
                (item) => item.rating === rating
            ).length,
        }));
    }, [feedback]);

    if (loading || !profile || !isAdmin) {
        return null;
    }

    return (
        <main className="main">

            <div className="admin-feedback-page">

                <Link
                    href="/admin"
                    className="admin-feedback-back"
                >
                    &#8592; Back to Administration
                </Link>

                <div className="admin-feedback-heading">

                    <div>
                        <h1>
                            Feedback
                        </h1>

                        <p>
                            Review learner feedback and
                            training experience ratings.
                        </p>
                    </div>

                </div>

                {/* Summary */}
                <div className="feedback-summary">

                    <div className="feedback-summary-card">

                        <span className="summary-label">
                            Total Responses
                        </span>

                        <strong>
                            {totalResponses}
                        </strong>

                    </div>

                    <div className="feedback-summary-card">

                        <span className="summary-label">
                            Average Rating
                        </span>

                        <strong>
                            {totalResponses
                                ? averageRating.toFixed(1)
                                : "—"}
                        </strong>

                        <span className="summary-stars">
                            ★★★★★
                        </span>

                    </div>

                    <div className="feedback-summary-card">

                        <span className="summary-label">
                            Latest Feedback
                        </span>

                        <strong>
                            {feedback.length
                                ? new Date(
                                      feedback[0].created_at
                                  ).toLocaleDateString()
                                : "—"}
                        </strong>

                    </div>

                </div>

                {/* Rating Breakdown */}
                <section className="admin-feedback-panel">

                    <div className="admin-feedback-panel-header">
                        <h2>
                            Rating Overview
                        </h2>
                    </div>

                    <div className="rating-breakdown">

                        {ratingCounts.map((item) => (
                            <div
                                key={item.rating}
                                className="rating-row"
                            >
                                <span>
                                    {item.rating} ★
                                </span>

                                <div className="rating-bar">
                                    <div
                                        className="rating-bar-fill"
                                        style={{
                                            width:
                                                totalResponses > 0
                                                    ? `${(item.count / totalResponses) * 100}%`
                                                    : "0%",
                                        }}
                                    />
                                </div>

                                <span className="rating-count">
                                    {item.count}
                                </span>
                            </div>
                        ))}

                    </div>

                </section>

                {/* Feedback List */}
                <section className="admin-feedback-panel">

                    <div className="admin-feedback-panel-header">

                        <h2>
                            Learner Feedback
                        </h2>

                        <span>
                            {totalResponses} response
                            {totalResponses === 1
                                ? ""
                                : "s"}
                        </span>

                    </div>

                    {loadingFeedback ? (
                        <div className="feedback-state">
                            Loading feedback...
                        </div>
                    ) : error ? (
                        <div className="feedback-state feedback-state-error">
                            {error}
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="feedback-state">
                            No feedback has been submitted yet.
                        </div>
                    ) : (
                        <div className="feedback-list">

                            {feedback.map((item) => (
                                <article
                                    key={item.id}
                                    className="feedback-item"
                                >

                                    <div className="feedback-item-top">

                                        <div>
                                            <div className="feedback-rating">
                                                {"★".repeat(
                                                    item.rating
                                                )}
                                                {"☆".repeat(
                                                    5 -
                                                        item.rating
                                                )}
                                            </div>

                                            <span className="feedback-category">
                                                {item.category}
                                            </span>
                                        </div>

                                        <time>
                                            {new Date(
                                                item.created_at
                                            ).toLocaleString()}
                                        </time>

                                    </div>

                                    <p className="feedback-message">
                                        {item.message}
                                    </p>

                                    <div className="feedback-user">
                                        {item.email}
                                    </div>

                                </article>
                            ))}

                        </div>
                    )}

                </section>

            </div>

        </main>
    );
}