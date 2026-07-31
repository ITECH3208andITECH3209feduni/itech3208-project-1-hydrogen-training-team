'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {

	const pathname = usePathname();

	const router = useRouter();

	const {
		user,
		logout,
		permissions,
	} = useAuth();

	// Hide navbar on authentication pages
	
const hideNavbar =
    pathname === "/login" ||
    pathname.startsWith("/login/register") ||
    pathname === "/forgot-password";

if (hideNavbar) {
    return null;
}

	async function handleLogout() {

		try {

			await logout();

			router.replace("/login");

		} catch (error) {

			console.error("Logout failed", error);

		}

	}

	return (

		<nav className="nav">

			<div className="logo">

				<span>
					Hydrogen Lab Safety
				</span>

			</div>

			<div className="nav-links">

				<Link
					href="/"
					className={`nav-link ${pathname === "/" ? "active" : ""}`}
				>
					Dashboard
				</Link>

				<Link
					href="/modules"
					className={`nav-link ${pathname === "/modules" ? "active" : ""}`}
				>
					Modules
				</Link>

				<Link
					href="/lab"
					className={`nav-link ${pathname === "/lab" ? "active" : ""}`}
				>
					Scenarios
				</Link>

				<Link
					href="/quizzes"
					className={`nav-link ${pathname === "/quizzes" ? "active" : ""}`}
				>
					Quizzes
				</Link>

				{/* Admin Only */}
				{permissions.canManageUsers && (
					<Link
						href="/admin/users"
						className={`nav-link ${
							pathname.startsWith("/admin")
								? "active"
								: ""
						}`}
					>
						Administration
					</Link>
				)}

			</div>

			<div className="nav-right">

				{user && (

					<>

						<div
							className="avatar"
							title={
								user.displayName ??
								user.email ??
								"My Account"
							}
						>

							{user.email?.charAt(0).toUpperCase()}

						</div>

						<button
							onClick={handleLogout}
							style={{
								marginLeft: "12px",
								padding: "8px 14px",
								borderRadius: "8px",
								border: "none",
								cursor: "pointer",
								fontWeight: "600"
							}}
						>

							Logout

						</button>

					</>

				)}

			</div>

		</nav>

	);

}