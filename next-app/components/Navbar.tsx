// components/Navbar.tsx
// Navigation bar for whole application, includes links to pages and logout button.

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
            await logout();
            router.replace("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    }

    return (
        <nav className="nav">
            <Link href="/" className="logo">
                <span>Hydrogen Lab Safety</span>
            </Link>

            <div className="nav-links">
                <Link
                    href="/dashboard"
                    className={`nav-link ${
                        pathname === "/dashboard" ? "active" : ""
                    }`}
                >
                    Home
                </Link>

                <Link
                    href="/modules/hazard-modules"
                    className={`nav-link ${
                        pathname.startsWith("/modules")
                            ? "active"
                            : ""
                    }`}
                >
                    Modules
                </Link>

                <Link
                    href="/lab"
                    className={`nav-link ${
                        pathname === "/lab"
                            ? "active"
                            : ""
                    }`}
                >
                    Scenarios
                </Link>

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

                {/* About page */}
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

                {/* Administrator only */}
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