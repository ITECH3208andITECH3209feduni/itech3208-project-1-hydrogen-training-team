"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import "./feedback.css";

const categories = [
    "Training Modules",
    "Scenarios / Simulations",
    "Quizzes",
    "Website / Navigation",
    "Technical Issue",
    "Other",
];

export default function FeedbackPage() {
    const { user } = useAuth();

    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState("");
    const [feedback, setFeedback] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        if (!rating || !category || !feedback.trim()) {
            setError(
                "Please complete all required fields."
            );
            return;
        }

        if (!user) {
            setError(
                "You must be logged in to submit feedback."
            );
            return;
        }

        try {
            setSubmitting(true);

            const token = await user.getIdToken();

            const response = await fetch(
                "/api/feedback",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        rating,
                        category,
                        message: feedback,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error ||
                    "Unable to submit feedback."
                );
            }

            setSubmitted(true);

        } catch (submitError) {
            console.error(
                "Feedback submission failed:",
                submitError
            );

            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Unable to submit feedback. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (submitted) {
        return (
            <main className="feedback-page">
                <section className="feedback-card feedback-success">

                    <div className="success-icon">
                        &#10003;
                    </div>

                    <h1>
                        Thank You!
                    </h1>

                    <p>
                        Your feedback has been received.
                        Thank you for helping us improve the
                        Hydrogen Lab Safety training experience.
                    </p>

                    <Link
                        href="/dashboard"
                        className="feedback-button"
                    >
                        Return to Dashboard &#8594;
                    </Link>

                </section>
            </main>
        );
    }

    return (
        <main className="feedback-page">

            <div className="feedback-heading">

                <Link
                    href="/dashboard"
                    className="feedback-back"
                >
                    &#8592; Back to Dashboard
                </Link>

                <h1>
                    Feedback
                </h1>

                <p>
                    Help us improve the Hydrogen Lab Safety
                    training experience.
                </p>

            </div>

            <section className="feedback-card">

                <form onSubmit={handleSubmit}>

                    {error && (
                        <div className="feedback-error">
                            {error}
                        </div>
                    )}

                    {/* Rating */}
                    <div className="feedback-field">

                        <label>
                            How would you rate your experience?
                        </label>

                        <div className="rating-group">

                            {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`rating-star ${
                                        value <= rating
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setRating(value)
                                    }
                                    aria-label={`Rate ${value} out of 5`}
                                    disabled={submitting}
                                >
                                    &#9733;
                                </button>
                            ))}

                        </div>

                        <span className="rating-label">
                            {rating === 0
                                ? "Select a rating"
                                : `${rating} out of 5`}
                        </span>

                    </div>

                    {/* Category */}
                    <div className="feedback-field">

                        <label htmlFor="category">
                            What is your feedback about?
                        </label>

                        <select
                            id="category"
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                            required
                            disabled={submitting}
                        >
                            <option value="">
                                Select a category
                            </option>

                            {categories.map((item) => (
                                <option
                                    key={item}
                                    value={item}
                                >
                                    {item}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* Feedback */}
                    <div className="feedback-field">

                        <label htmlFor="feedback">
                            Tell us more
                        </label>

                        <textarea
                            id="feedback"
                            value={feedback}
                            onChange={(event) =>
                                setFeedback(event.target.value)
                            }
                            placeholder="Share your feedback..."
                            rows={7}
                            maxLength={5000}
                            required
                            disabled={submitting}
                        />

                    </div>

                    {/* Submit */}
                    <div className="feedback-actions">

                        <Link
                            href="/dashboard"
                            className="feedback-cancel"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="feedback-button"
                            disabled={
                                submitting ||
                                !rating ||
                                !category ||
                                !feedback.trim()
                            }
                        >
                            {submitting
                                ? "Submitting..."
                                : "Submit Feedback"}
                        </button>

                    </div>

                </form>

            </section>

        </main>
    );
}
