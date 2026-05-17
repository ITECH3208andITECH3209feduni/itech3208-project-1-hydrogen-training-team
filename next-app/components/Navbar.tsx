// Renders navigation bar, which consistent across tool

'use client';   // Marks as Client Component, makes interactive

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
	const pathname = usePathname();
	
	return (
		<nav className="nav">
			<div className="logo">
				<span>Hydrogen Lab Safety</span>
			</div>
			<div className="nav-links">
				<Link href="/"          className={`nav-link ${pathname === '/'          ? 'active' : ''}`}>Home</Link>
				<Link href="/modules"   className={`nav-link ${pathname === '/modules'   ? 'active' : ''}`}>Modules</Link>
				<Link href="/lab"       className={`nav-link ${pathname === '/lab'       ? 'active' : ''}`}>Scenarios</Link>
				<Link href="/quizzes"   className={`nav-link ${pathname === '/quizzes'   ? 'active' : ''}`}>Quizzes</Link>
			</div>
			<div className="nav-right">
				<div className="avatar" title="My Account">JD</div>
			</div>
		</nav>
	);
}