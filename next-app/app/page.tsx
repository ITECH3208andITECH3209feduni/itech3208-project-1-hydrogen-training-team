// app/intro/page.tsx
// Landing page & introduction to hydrogen topic.

'use client';	// Marks as Client Component, makes interactive

import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import "./intro.css";

export default function IntroPage() {
	// Authentication (swaps CTA wording for returning users; visitors aren't required to log in to view this page)
	const { user } = useAuth();
	const ctaLabel = user ? "Continue" : "Get Started";

	return (
		<main className="intro-page">
			<img
				src="/hydrogen-lab-bg.svg"
				alt=""
				aria-hidden="true"
				className="intro-lab-bg"
			/>

			<div className="intro-overlay"></div>

			{/* Hero Section */}
			<section className="intro-hero">
				<div className="intro-badge">🔬 Virtual Hydrogen Safety Training Platform</div>
				<h1>
					Your Gateway to Safe
					<br />
					<span className="intro-teal">Hydrogen Workspaces</span>
				</h1>
				<p>
					An interactive virtual training platform for science and engineering
					students, industry professionals, and anyone working in or around
					hydrogen environments. Go from beginner to job-ready — safely.
				</p>
				<div className="intro-btns">
					<Link href="/dashboard" className="intro-cta">
						{ctaLabel} →
					</Link>
					<Link href="/modules/hazard-modules" className="intro-outline">
						Learn the Basics
					</Link>
				</div>
			</section>

			{/* Quick Facts */}		
			<section className="intro-facts">
				<div className="intro-fact">
					<div className="intro-fact-num">4–75%</div>
					<div className="intro-fact-label">Flammability range in air</div>
				</div>
				<div className="intro-fact">
					<div className="intro-fact-num">14×</div>
					<div className="intro-fact-label">Lighter than air</div>
				</div>
				<div className="intro-fact">
					<div className="intro-fact-num">−253°C</div>
					<div className="intro-fact-label">Liquid storage temp</div>
				</div>
				<div className="intro-fact">
					<div className="intro-fact-num">3×</div>
					<div className="intro-fact-label">More energy/kg than petrol</div>
				</div>
			</section>
			
			{/* Training Sections */}
			<section className="intro-section">
				<h2 className="intro-section-title">What is Hydrogen Lab Safety?</h2>
				<p className="intro-section-sub">
					A virtual laboratory training tool built to take non-experts from
					beginner to intermediate level through modules, simulated lab
					scenarios, and quizzes.
				</p>
				<div className="intro-grid4">
					<div className="intro-card">
						<div className="intro-card-icon">📚</div>
						<p className="intro-card-title">Training Modules</p>
						<p className="intro-card-text">
							Structured lessons on hydrogen properties, hazard identification,
							safety protocols, and emergency response.
						</p>
					</div>
					<div className="intro-card">
						<div className="intro-card-icon">🧪</div>
						<p className="intro-card-title">Lab Simulations</p>
						<p className="intro-card-text">
							Explore virtual hydrogen lab and industrial environments. Identify
							hazards in a safe digital space.
						</p>
					</div>
					<div className="intro-card">
						<div className="intro-card-icon">📝</div>
						<p className="intro-card-title">Knowledge Quizzes</p>
						<p className="intro-card-text">
							Test understanding at every stage with scenario-based quizzes and
							instant feedback.
						</p>
					</div>
					<div className="intro-card">
						<div className="intro-card-icon">🏆</div>
						<p className="intro-card-title">Certification</p>
						<p className="intro-card-text">
							Complete the full program and earn a printable certificate of
							completion.
						</p>
					</div>
				</div>
			</section>

			{/* Target Audience */}
			<section className="intro-section-alt">
				<h2 className="intro-section-title">Who Is This For?</h2>
				<p className="intro-section-sub">
					Built for anyone stepping into a hydrogen workspace for the first
					time.
				</p>
				<div className="intro-grid4">
					<div className="intro-aud-card">
						<span className="intro-aud-icon">🎓</span>
						<p className="intro-aud-title">Students</p>
						<p className="intro-aud-text">
							Science and engineering undergrads and postgrads preparing for
							lab work.
						</p>
					</div>
					<div className="intro-aud-card">
						<span className="intro-aud-icon">🏭</span>
						<p className="intro-aud-title">Industry Workers</p>
						<p className="intro-aud-text">
							Non-science employees upskilling before entering hydrogen spaces.
						</p>
					</div>
					<div className="intro-aud-card">
						<span className="intro-aud-icon">🔬</span>
						<p className="intro-aud-title">Researchers</p>
						<p className="intro-aud-text">
							Early-career researchers new to hydrogen fuel systems.
						</p>
					</div>
					<div className="intro-aud-card">
						<span className="intro-aud-icon">👷</span>
						<p className="intro-aud-title">Safety Officers</p>
						<p className="intro-aud-text">
							Workplace safety personnel seeking a structured training
							resource.
						</p>
					</div>
				</div>
			</section>

			{/* Hydrogen Fundamentals */}
			<section className="intro-section">
				<h2 className="intro-section-title">Hydrogen Fundamentals</h2>
				<p className="intro-section-sub">
					Key things to know about hydrogen before you begin training.
				</p>
				<div className="intro-grid3">
					<div className="intro-fund-card">
						<div className="intro-fund-header">
							<span className="intro-fund-icon">⚗️</span>
							<p className="intro-fund-title">What is hydrogen?</p>
						</div>
						<p className="intro-fund-text">
							Hydrogen (H₂) is the lightest and most abundant element. As a fuel
							it produces only water — a clean energy carrier central to the
							green energy transition.
						</p>
					</div>
					<div className="intro-fund-card">
						<div className="intro-fund-header">
							<span className="intro-fund-icon">🔥</span>
							<p className="intro-fund-title">Flammability</p>
						</div>
						<p className="intro-fund-text">
							Highly flammable with a wide range of 4–75% in air. Ignites
							easily and burns with a nearly invisible flame — making leak
							detection critical in any hydrogen workspace.
						</p>
					</div>
					<div className="intro-fund-card">
						<div className="intro-fund-header">
							<span className="intro-fund-icon">💨</span>
							<p className="intro-fund-title">Buoyancy and leaks</p>
						</div>
						<p className="intro-fund-text">
							14 times lighter than air, hydrogen disperses rapidly upward but
							accumulates in ceilings and enclosed spaces, creating serious
							explosion hazards.
						</p>
					</div>
					<div className="intro-fund-card">
						<div className="intro-fund-header">
							<span className="intro-fund-icon">🧊</span>
							<p className="intro-fund-title">Storage forms</p>
						</div>
						<p className="intro-fund-text">
							Stored as compressed gas (700 bar), cryogenic liquid (−253°C), or
							solid-state materials. Each method carries unique hazards and
							safety protocols.
						</p>
					</div>
					<div className="intro-fund-card">
						<div className="intro-fund-header">
							<span className="intro-fund-icon">⚡</span>
							<p className="intro-fund-title">Energy carrier</p>
						</div>
						<p className="intro-fund-text">
							Hydrogen stores energy chemically and can be produced from
							renewables via electrolysis. It has about 3x more energy per kg
							than petrol.
						</p>
					</div>
					<div className="intro-fund-card">
						<div className="intro-fund-header">
							<span className="intro-fund-icon">👁️</span>
							<p className="intro-fund-title">Detection challenges</p>
						</div>
						<p className="intro-fund-text">
							Colourless, odourless, and tasteless — completely undetectable by
							human senses. Dedicated hydrogen gas detectors are essential in
							any hydrogen facility.
						</p>
					</div>
				</div>
			</section>

			{/* Call to Action */}
			<section className="intro-cta-section">
				<h2 className="intro-cta-title">Ready to Start Your Training?</h2>
				<p className="intro-cta-sub">
					Join Hydrogen Lab Safety and take the first step toward working
					safely with hydrogen.
				</p>
				<Link href="/dashboard" className="intro-cta">
					{ctaLabel} →
				</Link>
			</section>
		</main>
	);
}
