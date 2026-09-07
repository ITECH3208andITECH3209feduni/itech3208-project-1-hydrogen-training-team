"use client";

// @ts-ignore: CSS module type declaration not found
import "./auth.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
        const { login } = useAuth();
        const router = useRouter();

        const [email, setEmail] = useState("");
        const [password, setPassword] = useState("");
        const [error, setError] = useState("");
        const [loading, setLoading] = useState(false);

        /*
         * Used to prevent the Login page from briefly
         * appearing when the user has just logged out.
         */
        const [redirectingAfterLogout, setRedirectingAfterLogout] =
                useState(true);

        /*
         * Check whether we arrived at the Login page
         * because of an intentional logout.
         */
        useEffect(() => {
                const logoutRedirect =
                        sessionStorage.getItem("logoutRedirect");

                if (logoutRedirect === "true") {
                        sessionStorage.removeItem("logoutRedirect");

                        router.replace("/");
                        return;
                }

                /*
                 * Normal visit to /login.
                 * Allow the Login page to display.
                 */
                setRedirectingAfterLogout(false);
        }, [router]);

        /*
         * Do not render the Login page while checking
         * whether this was caused by logout.
         */
        if (redirectingAfterLogout) {
                return null;
        }

        /*
         * Send login details to Firebase.
         */
        async function handleSubmit(
                e: React.FormEvent<HTMLFormElement>
        ) {
                e.preventDefault();

                setError("");
                setLoading(true);

                try {
                        await login(email, password);

                        router.push("/dashboard");
                } catch (err: any) {
                        setError(
                                err.code === "auth/invalid-credential"
                                        ? "Incorrect email or password. Please try again."
                                        : "Something went wrong. Please try again."
                        );
                }

                setLoading(false);
        }

        return (
                <div className="auth-page">
                        <div className="auth-card">

                                {/* Logo */}
                                <div className="auth-logo">
                                        <span className="auth-logo-icon">
                                                {"\u2697\uFE0F"}
                                        </span>

                                        <h1 className="auth-logo-title">
                                                Hydrogen Lab
                                        </h1>

                                        <p className="auth-logo-sub">
                                                Interactive safety learning
                                        </p>
                                </div>

                                <h2 className="auth-heading">
                                        Sign in
                                </h2>

                                {/* Error Message */}
                                {error && (
                                        <div className="auth-error">
                                                {error}
                                        </div>
                                )}

                                <form onSubmit={handleSubmit}>

                                        {/* Email Address */}
                                        <div className="auth-group">
                                                <label className="auth-label">
                                                        Email address
                                                </label>

                                                <input
                                                        className="auth-input"
                                                        type="email"
                                                        required
                                                        value={email}
                                                        onChange={(e) =>
                                                                setEmail(
                                                                        e.target.value
                                                                )
                                                        }
                                                        placeholder="Enter your email"
                                                />
                                        </div>

                                        {/* Password */}
                                        <div className="auth-group">
                                                <label className="auth-label">
                                                        Password
                                                </label>

                                                <input
                                                        className="auth-input"
                                                        type="password"
                                                        required
                                                        value={password}
                                                        onChange={(e) =>
                                                                setPassword(
                                                                        e.target.value
                                                                )
                                                        }
                                                        placeholder="Enter your password"
                                                />
                                        </div>

                                        {/* Forgot Password */}
                                        <div className="auth-forgot">
                                                <Link href="/login/forgot-password">
                                                        Forgot Password?
                                                </Link>
                                        </div>

                                        {/* Sign In */}
                                        <button
                                                className="auth-btn"
                                                disabled={loading}
                                                type="submit"
                                        >
                                                {loading
                                                        ? "Signing in..."
                                                        : "Sign in"}
                                        </button>

                                </form>

                                {/* Register */}
                                <div className="auth-switch">
                                        No account?{" "}
                                        <Link href="/login/register">
                                                Create one
                                        </Link>
                                </div>

                        </div>
                </div>
        );
}
