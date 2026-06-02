"use client";

import './auth.css';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
	const { login } = useAuth();
	const router = useRouter();

	const [email, setEmail]       = useState("");
	const [password, setPassword] = useState("");
	const [error, setError]       = useState("");
	const [loading, setLoading]   = useState(false);
	
	// Send login details to Firebase
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);
		
		try {					// If login details true, open dashboard page
			await login(email, password);
			router.push("/");
		} catch (err: any) {	// If login details false, send error message
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
				
				<div className="auth-logo">
					<span className="auth-logo-icon">⚗️</span>
					<h1 className="auth-logo-title">Hydrogen Lab</h1>
					<p className="auth-logo-sub">Interactive safety learning</p>
				</div>

				<h2 className="auth-heading">Sign in</h2>
				
				{/* Error Message */}
				{error && <div className="auth-error">{error}</div>}

				<form onSubmit={handleSubmit}>
					{/* Email Address Input */}
					<div className="auth-group">
						<label className="auth-label">Email address</label>
						<input
							className="auth-input"
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					
					{/* Password Input */}
					<div className="auth-group">
						<label className="auth-label">Password</label>
						<input
							className="auth-input"
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					
					{/* Sign-In Button */}
					<button className="auth-btn" disabled={loading}>
						{loading ? "Signing in…" : "Sign in"}
					</button>
				</form>
				
				{/* Link to Register Page */}
				<div className="auth-switch">
					No account?{" "}
					<Link href="/login/register">Create one</Link>
				</div>

			</div>
		</div>
	);
}
