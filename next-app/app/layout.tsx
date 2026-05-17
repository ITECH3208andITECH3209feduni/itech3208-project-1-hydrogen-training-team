// Root layout that wraps all pages, setting the HTML metdata and importing the css

import type { Metadata } from 'next';   // Used to type metadata object
import './globals.css';   // Applies css file to all pages in app
import Navbar from '@/components/Navbar';   // Applies navigation bar to all pages

// Defines metadata for page (Equivalent to <head> in html)
export const metadata: Metadata = {
	title: 'Hydrogen Lab Safety',
	description: 'Hydrogen Training Platform',
};

// Root layout component (wraps every page in app)
export default function RootLayout({
	children,   // Represents page currently being rendered
}: {
	children: React.ReactNode;
}) {
	return (   // Renders html and injects current page's content
		<html lang="en">
			<head>
				<link
					href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;800&family=Inter:wght@300;400;500&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>
				<div className="page-wrap">
					<Navbar />
					{children}
				</div>
			</body>
		</html>
	);
}
