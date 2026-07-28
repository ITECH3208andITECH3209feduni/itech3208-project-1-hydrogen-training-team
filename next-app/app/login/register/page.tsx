"use client";

// @ts-ignore: CSS import may not have type declarations in this setup
import "../auth.css";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
	const { register } = useAuth();
	const router = useRouter();

	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		confirm: "",
		userType: "public",
		organisation: "",
	});

	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	function update(field: string) {
		return (e: React.ChangeEvent<HTMLInputElement>) =>
			setForm((f) => ({ ...f, [field]: e.target.value }));
	}

	// Send registration details to Firebase
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");

		// Check passwords match
		if (form.password !== form.confirm) {
			return setError("Passwords do not match.");
		}

		// Check password length
		if (form.password.length < 6) {
			return setError("Password must be at least 6 characters.");
		}

		setLoading(true);

		try {
			await register({
				email: form.email,
				password: form.password,
				name: form.name,                 // Saved as Firebase displayName
				organisation: form.organisation,
				role: "user",
				user_type: "public",
			});

			router.push("/");
		} catch (err: any) {
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
					{/* Full Name */}
					<div className="auth-group">
						<label className="auth-label">Full Name</label>
						<input
							className="auth-input"
							type="text"
							required
							value={form.name}
							onChange={update("name")}
							placeholder="Enter your full name"
						/>
					</div>

					{/* Organisation (Optional) */}
					<div className="auth-group">
						<label className="auth-label">
							Organisation <span style={{ fontWeight: "normal" }}>(optional)</span>
						</label>
						<input
							className="auth-input"
							type="text"
							value={form.organisation}
							onChange={update("organisation")}
							placeholder="University, school or company"
						/>
					</div>

					{/* Email */}
					<div className="auth-group">
						<label className="auth-label">Email address</label>
						<input
							className="auth-input"
							type="email"
							required
							value={form.email}
							onChange={update("email")}
							placeholder="Enter your email"
						/>
					</div>

					{/* Password */}
					<div className="auth-group">
						<label className="auth-label">Password</label>
						<input
							className="auth-input"
							type="password"
							required
							value={form.password}
							onChange={update("password")}
							placeholder="Enter your password"
						/>
					</div>

					{/* Confirm Password */}
					<div className="auth-group">
						<label className="auth-label">Confirm password</label>
						<input
							className="auth-input"
							type="password"
							required
							value={form.confirm}
							onChange={update("confirm")}
							placeholder="Confirm your password"
						/>
					</div>

					{/* Register Button */}
					<button className="auth-btn" disabled={loading}>
						{loading ? "Creating account…" : "Create account"}
					</button>
				</form>

				{/* Login Link */}
				<div className="auth-switch">
					Already registered? <Link href="/login">Sign in</Link>
				</div>
			</div>
		</div>
	);
}