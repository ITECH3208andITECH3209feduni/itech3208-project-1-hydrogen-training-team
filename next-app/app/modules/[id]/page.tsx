'use client';

// Module detail page with learner progress tracking

import '../modules.css';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getModuleById } from '@/lib/modules';
import SectionBlock from './components/SectionBlock';

export default function ModulePage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const params = useParams();

	const id = Array.isArray(params.id)
		? params.id[0]
		: params.id;

	const mod = id ? getModuleById(id) : undefined;

	const [currentProgress, setCurrentProgress] = useState(0);

	// ---------------------------------------------------------
	// Progress tracking
	// ---------------------------------------------------------

	// Prevent duplicate progress requests
	const lastSavedProgress = useRef(0);

	// ---------------------------------------------------------
	// Time tracking
	// ---------------------------------------------------------

	// Total minutes already saved in Supabase
	const savedTimeMinutes = useRef(0);

	// Active seconds accumulated during the current visit
	const sessionSeconds = useRef(0);

	// Prevent multiple time-save requests
	const savingTime = useRef(false);

	// ---------------------------------------------------------
	// Redirect unauthenticated users
	// ---------------------------------------------------------

	useEffect(() => {
		if (!loading && !user) {
			router.replace('/login');
		}
	}, [user, loading, router]);

	// ---------------------------------------------------------
	// Redirect invalid module IDs
	// ---------------------------------------------------------

	useEffect(() => {
		if (!loading && user && id && !mod) {
			router.replace('/modules');
		}
	}, [loading, user, id, mod, router]);

	// ---------------------------------------------------------
	// Create the progress record and load existing progress
	// ---------------------------------------------------------

	useEffect(() => {
		if (loading || !user || !mod) {
			return;
		}

		const currentUser = user;
		const currentModule = mod;

		async function loadProgress() {
			try {
				const token =
					await currentUser.getIdToken();

				// Create the progress record if necessary
				const startResponse =
					await fetch(
						'/api/modules/progress',
						{
							method: 'POST',
							headers: {
								'Content-Type':
									'application/json',
								Authorization:
									`Bearer ${token}`,
							},
							body: JSON.stringify({
								module_id:
									currentModule.id,
							}),
						}
					);

				const startResult =
					await startResponse.json();

				if (
					!startResponse.ok ||
					!startResult.ok
				) {
					console.error(
						'Failed to start module:',
						startResult.error
					);

					return;
				}

				// Get the user's existing progress
				const response =
					await fetch(
						'/api/modules/progress',
						{
							method: 'GET',
							headers: {
								Authorization:
									`Bearer ${token}`,
							},
							cache: 'no-store',
						}
					);

				const result =
					await response.json();

				if (
					!response.ok ||
					!result.ok
				) {
					console.error(
						'Failed to load module progress:',
						result.error
					);

					return;
				}

				const record =
					result.progress?.find(
						(item: {
							module_id:
								string | number;
							progress: number;
							time_spent?:
								number | null;
						}) =>
							String(
								item.module_id
							) ===
							String(
								currentModule.id
							)
					);

				if (record) {
					const savedProgress =
						Number(
							record.progress ??
								0
						);

					const savedTime =
						Number(
							record.time_spent ??
								0
						);

					setCurrentProgress(
						savedProgress
					);

					lastSavedProgress.current =
						savedProgress;

					// Remember the time already
					// stored in Supabase
					savedTimeMinutes.current =
						Math.max(
							0,
							savedTime
						);
				}
			} catch (error) {
				console.error(
					'Failed to load module progress:',
					error
				);
			}
		}

		loadProgress();
	}, [loading, user, mod]);

	// ---------------------------------------------------------
	// Active time tracking
	// ---------------------------------------------------------

	useEffect(() => {
		if (loading || !user || !mod) {
			return;
		}

		const currentUser = user;
		const currentModule = mod;

		// Reset the session counter when entering
		// a module
		sessionSeconds.current = 0;

		let active = true;

		/*
		 * Save the accumulated active time.
		 *
		 * Supabase stores time in minutes.
		 * We keep seconds locally so that 30-second
		 * saves do not round up and artificially
		 * inflate the user's time.
		 */
		const saveTimeSpent =
			async () => {
				if (
					!active ||
					savingTime.current ||
					sessionSeconds.current <
						1
				) {
					return;
				}

				try {
					savingTime.current =
						true;

					const elapsedMinutes =
						Math.floor(
							sessionSeconds.current /
								60
						);

					// Don't save until we have at least
					// one complete minute
					if (
						elapsedMinutes <
						1
					) {
						return;
					}

					const token =
						await currentUser.getIdToken();

					const newTotalMinutes =
						savedTimeMinutes.current +
						elapsedMinutes;

					const response =
						await fetch(
							'/api/modules/progress',
							{
								method: 'PATCH',

								headers: {
									'Content-Type':
										'application/json',

									Authorization:
										`Bearer ${token}`,
								},

								body: JSON.stringify({
									module_id:
										currentModule.id,

									time_spent:
										newTotalMinutes,
								}),
							}
						);

					const result =
						await response.json();

					if (
						!response.ok ||
						!result.ok
					) {
						console.error(
							'Failed to save time spent:',
							result.error
						);

						return;
					}

					// Remember the new total
					savedTimeMinutes.current =
						newTotalMinutes;

					// Remove only the minutes that
					// were successfully saved.
					sessionSeconds.current -=
						elapsedMinutes * 60;
				} catch (error) {
					console.error(
						'Failed to update time spent:',
						error
					);
				} finally {
					savingTime.current =
						false;
				}
			};

		/*
		 * Count active time every second.
		 *
		 * The page being visible is used as the
		 * indication that the learner is actively
		 * using the module.
		 */
		const timer =
			window.setInterval(() => {
				if (
					document.visibilityState ===
					'visible'
				) {
					sessionSeconds.current +=
						1;
				}
			}, 1000);

		/*
		 * Save every 30 seconds.
		 */
		const saveInterval =
			window.setInterval(() => {
				void saveTimeSpent();
			}, 30_000);

		/*
		 * Save when the user switches tabs,
		 * minimises the browser, or leaves the page.
		 */
		const handleVisibilityChange =
			() => {
				if (
					document.visibilityState ===
					'hidden'
				) {
					void saveTimeSpent();
				}
			};

		document.addEventListener(
			'visibilitychange',
			handleVisibilityChange
		);

		/*
		 * Cleanup when the learner navigates
		 * to another module/page.
		 */
		return () => {
			active = false;

			window.clearInterval(timer);

			window.clearInterval(
				saveInterval
			);

			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange
			);

			/*
			 * Attempt to save any remaining
			 * complete minutes.
			 */
			void saveTimeSpent();
		};
	}, [loading, user, mod]);

	// ---------------------------------------------------------
	// Track sections as they become visible
	// ---------------------------------------------------------

	useEffect(() => {
		if (loading || !user || !mod) {
			return;
		}

		const currentUser = user;
		const currentModule = mod;

		const sectionElements =
			document.querySelectorAll<HTMLElement>(
				'[data-module-section]'
			);

		if (!sectionElements.length) {
			return;
		}

		let highestSectionReached = 0;

		// Continue from previously saved progress
		if (currentProgress > 0) {
			highestSectionReached =
				Math.ceil(
					(currentProgress / 100) *
						currentModule.sections.length
				);
		}

		const updateProgress =
			async (
				sectionNumber: number
			) => {
				if (
					sectionNumber <=
						highestSectionReached &&
					lastSavedProgress.current >
						0
				) {
					return;
				}

				highestSectionReached =
					Math.max(
						highestSectionReached,
						sectionNumber
					);

				const totalSections =
					currentModule.sections.length;

				const progress =
					Math.min(
						100,
						Math.round(
							(highestSectionReached /
								totalSections) *
								100
						)
					);

				if (
					progress <=
					lastSavedProgress.current
				) {
					return;
				}

				try {
					const token =
						await currentUser.getIdToken();

					const response =
						await fetch(
							'/api/modules/progress',
							{
								method: 'PATCH',

								headers: {
									'Content-Type':
										'application/json',

									Authorization:
										`Bearer ${token}`,
								},

								body: JSON.stringify({
									module_id:
										currentModule.id,

									progress,
								}),
							}
						);

					const result =
						await response.json();

					if (
						!response.ok ||
						!result.ok
					) {
						console.error(
							'Failed to save progress:',
							result.error
						);

						return;
					}

					lastSavedProgress.current =
						progress;

					setCurrentProgress(
						progress
					);
				} catch (error) {
					console.error(
						'Failed to update progress:',
						error
					);
				}
			};

		const observer =
			new IntersectionObserver(
				(entries) => {
					entries.forEach(
						(entry) => {
							if (
								!entry.isIntersecting
							) {
								return;
							}

							const sectionNumber =
								Number(
									entry.target.getAttribute(
										'data-section-number'
									)
								);

							if (
								sectionNumber >
								0
							) {
								updateProgress(
									sectionNumber
								);
							}
						}
					);
				},
				{
					threshold: 0.5,
				}
			);

		sectionElements.forEach(
			(section) => {
				observer.observe(
					section
				);
			}
		);

		return () => {
			observer.disconnect();
		};
	}, [
		loading,
		user,
		mod,
		currentProgress,
	]);

	// ---------------------------------------------------------
	// Loading
	// ---------------------------------------------------------

	if (loading) {
		return <div>Loading…</div>;
	}

	// ---------------------------------------------------------
	// Not authenticated
	// ---------------------------------------------------------

	if (!user) {
		return null;
	}

	// ---------------------------------------------------------
	// Invalid module
	// ---------------------------------------------------------

	if (!mod) {
		return null;
	}

	// ---------------------------------------------------------
	// Page
	// ---------------------------------------------------------

	return (
		<main
			className="main"
			style={{
				maxWidth: '820px',
			}}
		>
			{/* Breadcrumb */}

			<div className="back-crumb">
				<Link href="/modules">
					← Modules
				</Link>

				{' '}/ Hazard {mod.hazardNum} –{' '}
				{mod.title}
			</div>

			{/* Hero */}

			<div className="module-hero">
				<div
					className="module-icon-big"
					style={{
						background:
							mod.iconBg,
					}}
				>
					{mod.icon}
				</div>

				<div className="module-hero-text">
					<div className="hazard-label">
						⚠ Hazard{' '}
						{mod.hazardNum}
					</div>

					<h1>{mod.title}</h1>

					<p>
						Read through all
						sections to complete
						this module. Then
						test your knowledge
						in the Quizzes.
					</p>
				</div>
			</div>

			{/* Current progress */}

			{currentProgress > 0 && (
				<div
					style={{
						marginBottom:
							'20px',

						padding:
							'12px 16px',

						borderRadius:
							'10px',

						background:
							'rgba(0, 180, 216, 0.08)',

						border:
							'1px solid rgba(0, 180, 216, 0.25)',
					}}
				>
					<div
						style={{
							display:
								'flex',

							justifyContent:
								'space-between',

							marginBottom:
								'7px',

							fontSize:
								'0.85rem',
						}}
					>
						<span>
							Module Progress
						</span>

						<strong>
							{
								currentProgress
							}
							%
						</strong>
					</div>

					<div
						style={{
							height:
								'6px',

							borderRadius:
								'10px',

							background:
								'rgba(255,255,255,0.08)',

							overflow:
								'hidden',
						}}
					>
						<div
							style={{
								width:
									`${currentProgress}%`,

								height:
									'100%',

								background:
									'var(--teal)',

								transition:
									'width 0.3s ease',
							}}
						/>
					</div>
				</div>
			)}

			{/* Sections */}

			{mod.sections.map(
				(section) => (
					<div
						key={section.num}
						data-module-section
						data-section-number={
							section.num
						}
					>
						<SectionBlock
							section={
								section
							}
						/>
					</div>
				)
			)}

			{/* Key Takeaway */}

			<div className="takeaway-box">
				<h3>
					🔑 Key Takeaway
				</h3>

				<p>
					{mod.keyTakeaway}
				</p>
			</div>

			{/* Previous / Next navigation */}

			<div className="module-nav">
				{mod.prevId ? (
					<Link
						href={`/modules/${mod.prevId}`}
						className="nav-btn"
					>
						← Previous
					</Link>
				) : (
					<span />
				)}

				{mod.nextId ? (
					<Link
						href={`/modules/${mod.nextId}`}
						className="nav-btn teal"
					>
						Next Module →
					</Link>
				) : (
					<Link
						href="/modules"
						className="nav-btn teal"
					>
						Back to Modules
					</Link>
				)}
			</div>
		</main>
	);
}