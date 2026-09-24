// app/layout.tsx
// Root layout that wraps all pages, setting the HTML metdata and importing the css

import type { Metadata } from "next";					// Used to type metadata object
import { Exo_2, Inter } from "next/font/google";		// Self-hosted, subset Google fonts (no render-blocking request to Google)
import "./globals.css";									// Applies css file to all pages in app
import Navbar from "@/components/Navbar";				// Applies navigation bar to all pages
import { AuthProvider } from "../context/AuthContext";

// Fonts. Each exposes a CSS variable (--font-inter / --font-exo2) that globals.css
// wraps as --font-body / --font-heading. Stylesheets should use those two tokens.
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const exo2 = Exo_2({
	subsets: ["latin"],
	weight: ["300", "400", "600", "700", "800"],
	variable: "--font-exo2",
	display: "swap",
});

// Defines metadata for page (Equivalent to <head> in html)
export const metadata: Metadata = {
	title: "Hydrogen Lab Safety",
	description: "Hydrogen Training Platform",
};

// Root layout component (wraps every page in app)
export default function RootLayout({
	children,		// Represents page currently being rendered
}: {
	children: React.ReactNode;
}) {
	// Renders html and injects current page's content
	return (
		<html lang="en" className={`${inter.variable} ${exo2.variable}`}>
			<body>
				<AuthProvider>
					<div className="page-wrap">
						<Navbar />
						{children}
					</div>
				</AuthProvider>
			</body>
		</html>
	);
}
