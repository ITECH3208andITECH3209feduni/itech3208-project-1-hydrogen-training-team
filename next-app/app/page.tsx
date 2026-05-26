// app/page.tsx  –  Hydrogen Lab Safety Dashboard

'use client';	// Marks as Client Component, makes interactive

import Link from 'next/link';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
	// Authentication
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/login");
		}
	}, [user, loading, router]);

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
					</span>
					👋
				</h1>
				<p>Continue your hydrogen technology training journey</p>
			</div>
			
			{/* Stat Cards */}
			<div className="stat-cards">
				<Link href="/modules" className="stat-card">
					<div className="stat-icon modules">📚</div>
					<div className="stat-info">
						<div className="label">Modules</div>
						<div className="count">12</div>
						<div className="sub">4 completed · 3 in progress</div>
					</div>
					<div className="stat-arrow">→</div>
				</Link>

				<Link href="/lab" className="stat-card">
					<div className="stat-icon scenarios">🔬</div>
					<div className="stat-info">
						<div className="label">Scenarios / Simulation</div>
						<div className="count">8</div>
						<div className="sub">2 completed · 1 in progress</div>
					</div>
					<div className="stat-arrow">→</div>
				</Link>

				<Link href="/quizzes" className="stat-card">
					<div className="stat-icon quizzes">📝</div>
					<div className="stat-info">
						<div className="label">Quizzes</div>
						<div className="count">16</div>
						<div className="sub">6 completed · avg score 84%</div>
					</div>
					<div className="stat-arrow">→</div>
				</Link>
			</div>
			
			{/* Bottom Grid */}
			<div className="bottom-grid">
				
				{/* Training Progress */}
				<div className="panel">
					<div className="panel-header">📊 Training Progress</div>
					<div className="panel-body">
						<div className="progress-row">
							<div className="progress-track">
								<div className="progress-fill"></div>
							</div>
							<div className="progress-pct">65%</div>
						</div>
						<div className="module-list">
							<div className="module-item">
								<div className="module-dot dot-done"></div>
								<div className="module-name">H₂ Fundamentals &amp; Properties</div>
								<div className="module-status status-done">Done</div>
							</div>
							<div className="module-item">
								<div className="module-dot dot-done"></div>
								<div className="module-name">Safety Protocols &amp; Handling</div>
								<div className="module-status status-done">Done</div>
							</div>
							<div className="module-item">
								<div className="module-dot dot-prog"></div>
								<div className="module-name">Electrolysis &amp; Production</div>
								<div className="module-status status-prog">In Progress</div>
							</div>
							<div className="module-item">
								<div className="module-dot dot-todo"></div>
								<div className="module-name">Fuel Cell Technology</div>
								<div className="module-status status-todo">Not Started</div>
							</div>
							<div className="module-item">
								<div className="module-dot dot-todo"></div>
								<div className="module-name">Storage &amp; Transportation</div>
								<div className="module-status status-todo">Not Started</div>
							</div>
						</div>
					</div>
				</div>
				
				{/* Certificate */}
				<div className="panel">
					<div className="panel-header">🏆 Completed Modules</div>
					<div className="cert-body">
						<div className="cert-icon">🎓</div>
						<div className="cert-text">
							<h3>Hydrogen Safety Certification</h3>
							<p>
								You&apos;ve completed the Safety Protocols &amp; Handling module.
								<br />Download your certificate of completion.
							</p>
						</div>
						<a href="#" className="btn-cert">Download Certificate →</a>
					</div>
				</div>
			</div>
		</main>
	);
}