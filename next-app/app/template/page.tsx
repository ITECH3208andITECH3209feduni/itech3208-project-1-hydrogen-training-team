'use client';

import Link from 'next/link';

export default function TemplatePage() {
	return (
		<main className="main">
			<h1 style={{ marginTop: '20px', fontSize: '28px', textAlign: 'center', color: 'var(--white)' }}>
				Template Page
			</h1>
			<p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '8px' }}>
				Copy this folder to start developing a new page.
			</p>
			
			{/* Main content */}
			<div className="panel" style={{ width: '70%', maxWidth: '900px', margin: '30px auto' }}>
				Put the content of the page here.
			</div>
		</main>
	);
}