// app/certificate/page.tsx
// Downloadable certificate, unlocked once the user has passed a quiz

'use client';

import './certificate.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { QUIZ_TITLE, QUIZ_SLUG } from '@/lib/questionhazards';

interface QuizRecord {
	passed: boolean;
	score: number;
	date: string;
}

function storageKey(uid: string) {
	return `hydrogenlabsafety_quiz_hazards_${uid}`;
}

export default function CertificatePage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [record, setRecord] = useState<QuizRecord | null | undefined>(undefined);

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	useEffect(() => {
		if (!user) return;
		try {
			const raw = localStorage.getItem(storageKey(user.uid));
			setRecord(raw ? (JSON.parse(raw) as QuizRecord) : null);
		} catch {
			setRecord(null);
		}
	}, [user]);

	const displayName = user?.displayName || user?.email || 'Your Name';

	useEffect(() => {
		if (!record || !record.passed) return;
		drawCertificate(canvasRef.current, {
			name: displayName,
			score: record.score,
			date: new Date(record.date).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			}),
		});
	}, [record, displayName]);

	if (loading || record === undefined) return <div>Loading…</div>;
	if (!user) return null;

	function handleDownload() {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const link = document.createElement('a');
		link.download = `Hydrogen-Lab-Safety-Certificate-${displayName.replace(/\s+/g, '-')}.png`;
		link.href = canvas.toDataURL('image/png');
		link.click();
	}

	if (!record || !record.passed) {
		return (
			<main className="main">
				<div className="cert-blocked">
					<h1>No certificate yet</h1>
					<p>
						You need to pass the {QUIZ_TITLE} with a score of 70% or higher before you can
						claim your certificate.
					</p>
					<Link href={`/quizzes/${QUIZ_SLUG}`} className="btn-primary">
						Take the Quiz →
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="main">
			<div className="cert-page">
				<div className="cert-page-header">
					<span className="quiz-badge">🏆 Certification</span>
					<h1
						style={{
							fontFamily: "'Exo 2', sans-serif",
							fontSize: '2rem',
							fontWeight: 700,
							color: 'var(--white)',
						}}
					>
						Your Certificate is Ready
					</h1>
					<p>
						You scored {record.score}% on the {QUIZ_TITLE}. Here&apos;s your certificate,
						ready to download.
					</p>
				</div>

				<canvas ref={canvasRef} width={1200} height={800} className="cert-canvas" />

				<div className="cert-actions">
					<button className="btn-quiz" onClick={handleDownload}>
						Download Certificate
					</button>
					<Link href={`/quizzes/${QUIZ_SLUG}`} className="btn-outline">
						Retake Quiz
					</Link>
				</div>
			</div>
		</main>
	);
}

function drawCertificate(
	canvas: HTMLCanvasElement | null,
	{ name, score, date }: { name: string; score: number; date: string }
) {
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	const { width, height } = canvas;

	const bg = ctx.createLinearGradient(0, 0, width, height);
	bg.addColorStop(0, '#03045E');
	bg.addColorStop(0.5, '#0a0f3c');
	bg.addColorStop(1, '#020c2a');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = '#00B4D8';
	ctx.lineWidth = 6;
	ctx.strokeRect(30, 30, width - 60, height - 60);
	ctx.lineWidth = 1.5;
	ctx.strokeRect(46, 46, width - 92, height - 92);

	ctx.textAlign = 'center';

	ctx.fillStyle = '#00B4D8';
	ctx.font = '700 28px Inter, sans-serif';
	ctx.fillText('Hydrogen Lab Safety', width / 2, 130);

	ctx.fillStyle = '#F0F8FF';
	ctx.font = '800 56px Georgia, serif';
	ctx.fillText('Certificate of Achievement', width / 2, 210);

	ctx.fillStyle = '#7AAFCA';
	ctx.font = '400 22px Inter, sans-serif';
	ctx.fillText('This certifies that', width / 2, 300);

	ctx.fillStyle = '#F0F8FF';
	ctx.font = 'italic 700 48px Georgia, serif';
	ctx.fillText(name, width / 2, 370);

	ctx.strokeStyle = 'rgba(0,180,216,0.5)';
	ctx.beginPath();
	ctx.moveTo(width / 2 - 220, 395);
	ctx.lineTo(width / 2 + 220, 395);
	ctx.stroke();

	ctx.fillStyle = '#7AAFCA';
	ctx.font = '400 22px Inter, sans-serif';
	ctx.fillText('has successfully completed the', width / 2, 450);

	ctx.fillStyle = '#F0F8FF';
	ctx.font = '700 30px Inter, sans-serif';
	ctx.fillText(QUIZ_TITLE, width / 2, 495);

	ctx.fillStyle = '#00B4D8';
	ctx.font = '600 24px Inter, sans-serif';
	ctx.fillText(`with a score of ${score}%`, width / 2, 540);

	ctx.fillStyle = '#7AAFCA';
	ctx.font = '400 18px Inter, sans-serif';
	ctx.fillText(`Awarded on ${date}`, width / 2, 700);
}
