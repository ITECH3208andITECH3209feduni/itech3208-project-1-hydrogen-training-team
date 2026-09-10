// app/certificate/page.tsx
// Downloadable certificate, unlocked once the user has passed a quiz

'use client';

import './certificate.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { QUIZ_TITLE, QUIZ_SLUG } from '@/lib/questionhazards';
import { hazardModules } from '@/lib/hazardModules';

interface QuizRecord {
	passed: boolean;
	score: number;
        last_attempted_at?: string | null;
}

interface ModuleProgressRecord {
  module_id: string | number;
  progress?: number | null;
  status?: string | null;
}


export default function CertificatePage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [record, setRecord] = useState<QuizRecord | null | undefined>(undefined);
	const [moduleProgress, setModuleProgress] = useState<ModuleProgressRecord[]>([]);

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

        useEffect(() => {
                if (!user) return;
                const currentUser = user;
                let cancelled = false;

                async function loadCertificateProgress() {
                        try {
                                const token = await currentUser.getIdToken();

                                const headers = {
                                        Authorization: "Bearer " + token,
                                };

                                const [moduleResponse, quizResponse] = await Promise.all([
                                        fetch("/api/modules/progress?section=hazard-modules", {
                                                method: "GET",
                                                headers,
                                                cache: "no-store",
                                        }),

                                        fetch("/api/quizzes/progress", {
                                                method: "GET",
                                                headers,
                                                cache: "no-store",
                                        }),
                                ]);

                                const moduleResult = await moduleResponse.json();
                                const quizResult = await quizResponse.json();

                                if (cancelled) return;

                                if (!moduleResponse.ok || !moduleResult.ok) {
                                        throw new Error(moduleResult.error || "Unable to load module progress.");
                                }

                                if (!quizResponse.ok || !quizResult.ok) {
                                        throw new Error(quizResult.error || "Unable to load quiz progress.");
                                }

                                setModuleProgress(Array.isArray(moduleResult.progress) ? moduleResult.progress : []);

                                setRecord(quizResult.progress
                                        ? {
                                                passed: Boolean(quizResult.progress.passed),
                                                score: Number(quizResult.progress.score ?? 0),
                                                last_attempted_at: quizResult.progress.last_attempted_at ?? null,
                                        } : null
                                );
                        } catch (error) {
                                if (cancelled) return;
                                console.error("Failed to load certificate progress:", error);
                                setRecord(null);
                                setModuleProgress([]);
                        }
                }

                loadCertificateProgress();

                return () => {
                        cancelled = true;
                };
        }, [user]);

	const displayName = user?.displayName || 'Your Name';
        const totalModules = hazardModules.length;

        const completedModules = moduleProgress.filter(
                (module) => module.status === "done" || Number(module.progress ?? 0) >= 100
        ).length;

        const allModulesCompleted = totalModules > 0 && completedModules >= totalModules;
        const quizPassed = !!record && Number(record.score) >= 70;
        const certificateEligible = allModulesCompleted && quizPassed;

	useEffect(() => {
		if (!certificateEligible) return;
		drawCertificate(canvasRef.current, {
			name: displayName,
			score: record.score,
			date: new Date(record.last_attempted_at ?? Date.now()).toLocaleDateString(undefined, {
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

        if (!certificateEligible) {
                const needsModules = !allModulesCompleted;
                const needsQuiz = !quizPassed;

                return (
                        <main className="main">
                                <div className="cert-blocked">
                                        <h1>No certificate yet</h1>

                                        {needsModules && needsQuiz && (
                                                <p>Please complete all training modules and pass the {QUIZ_TITLE} with a score of 70% or higher before you can claim your certificate.</p>
                                        )}

                                        {needsModules && !needsQuiz && (
                                                <p>You have not yet completed all training modules. Complete all {totalModules} modules before you can claim your certificate.</p>
                                        )}

                                        {!needsModules && needsQuiz && (
                                                <p>
                                                        You have completed all training modules, but you need to pass the {QUIZ_TITLE} with a score of 70% or higher.
                                                        {record && (<> Your current score is {record.score}%.</>) }
                                                </p>
                                        )}

                                        {needsQuiz && (
                                                <Link
                                                        href={`/quizzes/${QUIZ_SLUG}`}
                                                        className="btn-primary"
                                                >
                                                        {record ? "Retake the Quiz" : "Take the Quiz →"}
                                                </Link>
                                        )}

                                        {needsModules && (
                                                <Link
                                                        href="/modules/hazard-modules"
                                                        className="btn-primary"
                                                >
                                                        Complete Training Modules
                                                </Link>
                                        )}
                                </div>
                        </main>
                );
        }

	return (
		<main className="main">
			<div className="cert-page">
				<div className="cert-page-header">
					<span className="cert-badge">🏆 Certification</span>
					<h1>
						Your Certificate is Ready
					</h1>
					<p>
						You scored {record.score}% on the {QUIZ_TITLE}. Here is your certificate,
						ready to download.
					</p>
				</div>

				<canvas ref={canvasRef} width={1200} height={800} className="cert-canvas" />

				<div className="cert-actions">
					<button className="btn-primary" onClick={handleDownload}>
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
