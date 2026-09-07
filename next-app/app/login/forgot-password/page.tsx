// app/login/forgot-password/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import "../auth.css";

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);

      setMessage("If an account exists for this email address, a password reset link has been sent.");
    } catch (err: any) {
      if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Unable to send password reset email. Please try again.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⚗️</span>
          <h1 className="auth-logo-title">Hydrogen Lab</h1>
          <p className="auth-logo-sub">Interactive safety learning</p>
        </div>

        <h2 className="auth-heading">Forgot Password</h2>
        <p className="auth-description">Enter your email address and we'll send you a password reset link.</p>

        <form onSubmit={handleSubmit}>
          <div className="auth-group">
            <label className="auth-label">Email Address</label>

            <input
              className="auth-input"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message && (
          <div className="auth-success">{message}</div>
        )}

        {error && (
          <div className="auth-error auth-feedback-below">{error}</div>
        )}

        <div className="auth-switch">
          <Link href="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}