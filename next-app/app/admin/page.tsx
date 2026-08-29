"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
    const { loading, profile, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!profile || !isAdmin)) {
            router.replace("/dashboard");
        }
    }, [loading, profile, isAdmin, router]);

    if (loading || !profile || !isAdmin) {
        return null;
    }

    return (
        <main className="main">
            <div
                style={{
                    maxWidth: "860px",
                    margin: "0 auto",
                    padding: "40px 20px",
                }}
            >
                <h1>Administration</h1>

                <p
                    style={{
                        marginTop: "8px",
                        color: "var(--muted)",
                    }}
                >
                    Manage users and Hydrogen Safety
                    Modules.
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                        gap: "24px",
                        marginTop: "35px",
                    }}
                >
                    <Link
                        href="/admin/users"
                        style={{
                            padding: "28px",
                            minHeight: "225px",
                            borderRadius: "14px",
                            border:
                                "1px solid rgba(255,255,255,.12)",
                            background:
                                "rgba(255,255,255,.04)",
                            color: "inherit",
                            textDecoration: "none",
                        }}
                    >
                        <h2>Admin Users</h2>

                        <p
                            style={{
                                marginTop: "10px",
                                color: "var(--muted)",
                            }}
                        >
                            Manage users, roles and
                            learner progress.
                        </p>
                    </Link>

                    <Link
                        href="/admin/modules"
                        style={{
                            padding: "28px",
                            minHeight: "225px",
                            borderRadius: "14px",
                            border:
                                "1px solid rgba(255,255,255,.12)",
                            background:
                                "rgba(255,255,255,.04)",
                            color: "inherit",
                            textDecoration: "none",
                        }}
                    >
                        <h2>Admin Modules</h2>

                        <p
                            style={{
                                marginTop: "10px",
                                color: "var(--muted)",
                            }}
                        >
                            Manage training videos
                            for Hydrogen Safety
                            Modules.
                        </p>
                    </Link>
                </div>
            </div>
        </main>
    );
}

