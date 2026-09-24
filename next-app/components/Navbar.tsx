// components/Navbar.tsx
// Universal navigation header that appears on all pages (some may purposfully hide it)

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
        pathname === "/login/forgot-password";

    if (hideNavbar) {
        return null;
    }

    async function handleLogout() {
        try {
            sessionStorage.setItem("logoutRedirect", "true");

            await logout();

            router.replace("/");
        } catch (error) {
            sessionStorage.removeItem("logoutRedirect");
            console.error("Logout failed", error);
        }
    }

    return (
        <nav className="nav">

            {/* Logo */}
            <Link href="/" className="logo">
                <span>Hydrogen Lab Safety</span>
                <img src="/logo/Hydrogen_Training_Logo_Navy_NoBackground.png" alt="Hydrogen Training Logo" className="logo-img" />
            </Link>

            <div className="nav-links">

                {/* Home */}
                <Link
                    href={user ? "/dashboard" : "/"}
                    className={`nav-link ${
                        pathname === "/" ||
                        pathname === "/dashboard"
                            ? "active"
                            : ""
                    }`}
                >
                    Home
                </Link>

                {/* Authenticated users only */}
                {user && (
                    <>
                        {/* Simulations */}
                        <Link
                            href="/lab"
                            className={`nav-link ${
                                pathname === "/lab"
                                    ? "active"
                                    : ""
                            }`}
                        >
                            Simulations
                        </Link>
                        
                        {/* Modules */}
                        <Link
                            href="/modules/hazards"
                            className={`nav-link ${
                                pathname.startsWith("/modules")
                                    ? "active"
                                    : ""
                            }`}
                        >
                            Modules
                        </Link>

                        {/* Quizzes */}
                        <Link
                            href="/quizzes"
                            className={`nav-link ${
                                pathname.startsWith("/quizzes")
                                    ? "active"
                                    : ""
                            }`}
                        >
                            Quizzes
                        </Link>
                    </>
                )}

                {/* About - available to everyone */}
                <Link
                    href="/about"
                    className={`nav-link ${
                        pathname === "/about"
                            ? "active"
                            : ""
                    }`}
                >
                    About
                </Link>

                {/* Administration - admin only */}
                {user && permissions.canManageUsers && (
                    <Link
                        href="/admin"
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

                {/* Login - logged-out users only */}
                {!user && (
                    <Link
                        href="/login"
                        className="btn-login"
                    >
                        Login
                    </Link>
                )}

                {/* Logged-in user controls */}
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
                            {user.email
                                ?.charAt(0)
                                .toUpperCase()}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="btn-logout"
                        >
                            Logout
                        </button>
                    </>
                )}

            </div>

        </nav>
    );
}

