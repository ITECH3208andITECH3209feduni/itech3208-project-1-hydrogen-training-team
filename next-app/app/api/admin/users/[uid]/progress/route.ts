// app/api/admin/users/[uid]/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        // Make sure the person requesting the data is an admin
        await requireAdmin(request);

        const { uid } = await params;

        if (!uid) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "User ID is required",
                },
                { status: 400 }
            );
        }

        // ---------------------------------------------------------
        // Get user profile
        // ---------------------------------------------------------
        const { data: profile, error: profileError } =
            await supabaseServer
                .from("profiles")
                .select("*")
                .eq("uid", uid)
                .single();

        if (profileError) {
            console.error(
                "ADMIN PROGRESS PROFILE ERROR:",
                profileError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: profileError.message,
                },
                { status: 500 }
            );
        }

        // ---------------------------------------------------------
        // Get module progress for this user
        // ---------------------------------------------------------
        const {
            data: moduleProgress,
            error: moduleProgressError,
        } = await supabaseServer
            .from("user_module_progress")
            .select("*")
            .eq("uid", uid)
            .order("module_id");

        if (moduleProgressError) {
            console.error(
                "ADMIN MODULE PROGRESS ERROR:",
                moduleProgressError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: moduleProgressError.message,
                },
                { status: 500 }
            );
        }

        // ---------------------------------------------------------
        // Get quiz progress for this user
        // ---------------------------------------------------------
        const {
            data: quizProgress,
            error: quizProgressError,
        } = await supabaseServer
            .from("user_quiz_progress")
            .select("*")
            .eq("uid", uid);

        if (quizProgressError) {
            console.error(
                "ADMIN QUIZ PROGRESS ERROR:",
                quizProgressError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: quizProgressError.message,
                },
                { status: 500 }
            );
        }

        // ---------------------------------------------------------
        // Calculate overall module progress
        // ---------------------------------------------------------
        const totalModules = 5;

        const completedModules =
            moduleProgress?.filter(
                (item) =>
                    item.status === "done" ||
                    Number(item.progress) >= 100
            ).length ?? 0;

        const overallProgress =
            totalModules > 0
                ? Math.round(
                      (completedModules / totalModules) * 100
                  )
                : 0;

        // ---------------------------------------------------------
        // Calculate quiz average
        // ---------------------------------------------------------
        const quizScores =
            quizProgress
                ?.map((item) => Number(item.score))
                .filter((score) => !Number.isNaN(score)) ?? [];

        const quizAverage =
            quizScores.length > 0
                ? Math.round(
                      quizScores.reduce(
                          (total, score) => total + score,
                          0
                      ) / quizScores.length
                  )
                : null;

        // ---------------------------------------------------------
        // Return everything needed by admin dashboard
        // ---------------------------------------------------------
        return NextResponse.json({
            ok: true,

            profile,

            moduleProgress:
                moduleProgress ?? [],

            quizProgress:
                quizProgress ?? [],

            summary: {
                totalModules,
                completedModules,
                overallProgress,
                quizAverage,
            },
        });
    } catch (error) {
        console.error(
            "ADMIN USER PROGRESS GET FAILED:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Internal server error.";

        const status =
            message === "Access denied" ||
            message === "Missing authorization token" ||
            message === "User profile not found"
                ? 403
                : 500;

        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status }
        );
    }
}