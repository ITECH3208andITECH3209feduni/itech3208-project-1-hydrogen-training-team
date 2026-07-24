"use client";

import '../auth.css';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
	const { register } = useAuth();
	const router = useRouter();

	const [form, setForm] = useState({
		name:     "",
		email:    "",
		password: "",
		confirm:  "",
	});
	const [error, setError]     = useState("");
	const [loading, setLoading] = useState(false);

	function update(field: string) {
		return (e: React.ChangeEvent<HTMLInputElement>) =>
			setForm((f) => ({ ...f, [field]: e.target.value }));
	}
	
	// Send login details to Firebase
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		
		if (form.password !== form.confirm) {	// Check that repetition of password is identical
			return setError("Passwords do not match.");
		}
		if (form.password.length < 6) {			// Check that password is long enough
			return setError("Password must be at least 6 characters.");
		}

		setLoading(true);

		try {					// If new login acceptable, open dashboard page
			await register(form.email, form.password, form.name);
			router.push("/");
		} catch (err: any) {	// If email address is already in use, send error message
			setError(
				err.code === "auth/email-already-in-use"
					? "An account with this email address already exists."
					: "Registration failed. Please try again."
			);
		}

		setLoading(false);
	}

	return (
		<div className="auth-page">
			<div className="auth-card">

				<div className="auth-logo">
					<span className="auth-logo-icon">⚗️</span>
					<h1 className="auth-logo-title">Hydrogen Lab</h1>
					<p className="auth-logo-sub">Create your student account</p>
				</div>

				<h2 className="auth-heading">Register</h2>
				
				{/* Error Message */}
				{error && <div className="auth-error">{error}</div>}

				<form onSubmit={handleSubmit}>
					{/* Name Input */}
					<div className="auth-group">
						<label className="auth-label">Full name</label>
						<input
							className="auth-input"
							type="text"
							required
							value={form.name}
							onChange={update("name")}
						/>
					</div>
					
					{/* Email Address Input */}
					<div className="auth-group">
						<label className="auth-label">Email address</label>
						<input
							className="auth-input"
							type="email"
							required
							value={form.email}
							onChange={update("email")}
						/>
					</div>
					
					{/* Password Input */}
					<div className="auth-group">
						<label className="auth-label">Password</label>
						<input
							className="auth-input"
							type="password"
							required
							value={form.password}
							onChange={update("password")}
						/>
					</div>
					
					{/* Confirm Password Input */}
					<div className="auth-group">
						<label className="auth-label">Confirm password</label>
						<input
							className="auth-input"
							type="password"
							required
							value={form.confirm}
							onChange={update("confirm")}
						/>
					</div>
					
					{/* Register Button */}
					<button className="auth-btn" disabled={loading}>
						{loading ? "Creating account…" : "Create account"}
					</button>
				</form>
				
				{/* Link to Login Page */}
				<div className="auth-switch">
					Already registered?{" "}
					<Link href="/login">Sign in</Link>
				</div>

			</div>
		</div>
	);
}
