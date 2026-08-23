// app/api/quizzes/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUIZ_ID = "hydrogen-hazards";

/* ---------------- GET ---------------- */

export async function GET(request: NextRequest) {
    try {
        const uid = await requireUser(request);

        const { data, error } = await supabaseServer
            .from("user_quiz_progress")
            .select("*")
            .eq("uid", uid)
            .eq("quiz_id", QUIZ_ID)
            .maybeSingle();

        if (error) {
            console.error(
                "GET quiz progress error:",
                error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            progress: data,
        });
    } catch (error) {
        console.error(
            "GET quiz progress exception:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 401 }
        );
    }
}

/* ---------------- POST ---------------- */

export async function POST(request: NextRequest) {
    try {
        const uid = await requireUser(request);

        const body = await request.json();

        const score = Number(body.score);
        const passed = Boolean(body.passed);

        if (
            Number.isNaN(score) ||
            score < 0 ||
            score > 100
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "score must be between 0 and 100",
                },
                { status: 400 }
            );
        }

        // Check whether the user already has a quiz record
        const {
            data: existing,
            error: existingError,
        } = await supabaseServer
            .from("user_quiz_progress")
            .select("*")
            .eq("uid", uid)
            .eq("quiz_id", QUIZ_ID)
            .maybeSingle();

        if (existingError) {
            console.error(
                "Existing quiz lookup error:",
                existingError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: existingError.message,
                },
                { status: 500 }
            );
        }

        const attempts = existing
            ? Number(existing.attempts) + 1
            : 1;

        const now = new Date().toISOString();

        /*
         * Keep the student's existing leaderboard
         * preference when they retry the quiz.
         *
         * New quiz records default to private.
         */
        const leaderboardVisible =
            existing?.leaderboard_visible ?? false;

        const { data, error } =
            await supabaseServer
                .from("user_quiz_progress")
                .upsert(
                    {
                        uid,
                        quiz_id: QUIZ_ID,
                        score,
                        attempts,
                        passed,
                        last_attempted_at: now,

                        leaderboard_visible:
                            leaderboardVisible,
                    },
                    {
                        onConflict:
                            "uid,quiz_id",
                    }
                )
                .select()
                .single();

        if (error) {
            console.error(
                "Save quiz progress error:",
                error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Quiz result saved",
            progress: data,
        });
    } catch (error) {
        console.error(
            "POST quiz progress exception:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 401 }
        );
    }
}

/* ---------------- PATCH ---------------- */

export async function PATCH(request: NextRequest) {
    try {
        const uid = await requireUser(request);

        const body = await request.json();

        if (
            typeof body.leaderboard_visible !==
            "boolean"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "leaderboard_visible must be true or false",
                },
                { status: 400 }
            );
        }

        const {
            data: existing,
            error: existingError,
        } = await supabaseServer
            .from("user_quiz_progress")
            .select("id")
            .eq("uid", uid)
            .eq("quiz_id", QUIZ_ID)
            .maybeSingle();

        if (existingError) {
            console.error(
                "Check quiz progress error:",
                existingError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: existingError.message,
                },
                { status: 500 }
            );
        }

        if (!existing) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No completed quiz record found. Submit the quiz first.",
                },
                { status: 404 }
            );
        }

        const {
            data,
            error,
        } = await supabaseServer
            .from("user_quiz_progress")
            .update({
                leaderboard_visible:
                    body.leaderboard_visible,
            })
            .eq("uid", uid)
            .eq("quiz_id", QUIZ_ID)
            .select()
            .single();

        if (error) {
            console.error(
                "Update leaderboard preference error:",
                error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message:
                "Leaderboard preference updated",
            progress: data,
        });
    } catch (error) {
        console.error(
            "PATCH quiz progress exception:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 401 }
        );
    }
}