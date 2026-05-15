// Root layout that wraps all pages, setting the HTML metdata and importing the css

import type { Metadata } from 'next';   // Used to type metadata object
import './globals.css';   // Applies css file to all pages in app

// Defines metadata for page (Equivalent to <head> in html)
export const metadata: Metadata = {
	title: 'Hydrogen Lab Safety',
	description: 'Interactive Hydrogen Lab Safety Training',
};

// Root layout component (wraps every page in app)
export default function RootLayout({
	children,   // Represents page currently being rendered
}: {
	children: React.ReactNode;
}) {
	return (   // Renders html
		<html lang="en">
			<body>{children}</body>   // Current page's content injected here
		</html>
	);
}
