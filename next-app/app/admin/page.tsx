// app/admin/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import HubCard from "@/components/HubCard";

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
            <div className="page-header">
                <h1>Admin Tools</h1>
                <p>
                    Manage user access, learner progress and feedback.
                </p>
            </div>

            <div className="hub-grid">
                <HubCard
                    href="/admin/users"
                    icon="👤"
                    title="User Management"
                    desc="Manage users, roles and learner progress."
                    linkText="Manage Users →"
                />

                <HubCard
                    href="/admin/feedback"
                    icon="💬"
                    title="Learner Feedback"
                    desc="Review learner ratings, comments and feedback from the training experience."
                    linkText="View Feedback →"
                />
            </div>
        </main>
    );
}