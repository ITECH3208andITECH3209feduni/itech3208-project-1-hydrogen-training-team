'use client';

import Link from 'next/link';

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function TemplatePage() {

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

			<h1
				style={{
					marginTop: '20px',
					fontSize: '28px',
					textAlign: 'center' as const,
					color: 'var(--white)'
				}}
			>

				Template Page

			</h1>

			<p
				style={{
					color: 'var(--muted)',
					textAlign: 'center' as const,
					marginTop: '8px'
				}}
			>

				Copy this folder to start developing a new page.

			</p>

			<div
				className="panel"
				style={{
					width: '70%',
					maxWidth: '900px',
					margin: '30px auto'
				}}
			>

				Put the content of the page here.

			</div>

		</main>

	);

}