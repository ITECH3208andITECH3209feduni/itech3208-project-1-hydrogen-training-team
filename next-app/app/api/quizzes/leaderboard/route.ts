// app/api/quizzes/leaderboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUIZ_ID = "hydrogen-hazards";

/* ---------------- GET LEADERBOARD ---------------- */

export async function GET(request: NextRequest) {
    try {
        // Require the requester to be logged in.
        await requireUser(request);

        /*
         * ---------------------------------------------------------
         * 1. Get quiz results that students have chosen to reveal
         * ---------------------------------------------------------
         */

        const {
            data: quizResults,
            error: quizError,
        } = await supabaseServer
            .from("user_quiz_progress")
            .select(
                "uid, score, attempts, passed, last_attempted_at"
            )
            .eq("quiz_id", QUIZ_ID)
            .eq("leaderboard_visible", true)
            .order("score", {
                ascending: false,
            });

        if (quizError) {
            console.error(
                "Leaderboard quiz results error:",
                quizError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: quizError.message,
                },
                { status: 500 }
            );
        }

        /*
         * If nobody has chosen to appear on the leaderboard,
         * return an empty leaderboard.
         */

        if (
            !quizResults ||
            quizResults.length === 0
        ) {
            return NextResponse.json({
                ok: true,
                leaderboard: [],
            });
        }

        /*
         * ---------------------------------------------------------
         * 2. Get the profile information
         * ---------------------------------------------------------
         *
         * We deliberately make this a separate query rather than
         * relying on a Supabase table relationship.
         */

        const uids = quizResults.map(
            (result) => result.uid
        );

        const {
            data: profiles,
            error: profileError,
        } = await supabaseServer
            .from("profiles")
            .select("uid, display_name")
            .in("uid", uids);

        if (profileError) {
            console.error(
                "Leaderboard profile lookup error:",
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

        /*
         * ---------------------------------------------------------
         * 3. Match quiz results with profile display names
         * ---------------------------------------------------------
         */

        const profileMap = new Map(
            (profiles || []).map((profile) => [
                profile.uid,
                profile.display_name,
            ])
        );

        /*
         * ---------------------------------------------------------
         * 4. Build the leaderboard
         * ---------------------------------------------------------
         */

        const leaderboard = quizResults
            .map((result) => ({
                uid: result.uid,

                display_name:
                    profileMap.get(result.uid) ||
                    "Anonymous",

                score: Number(result.score) || 0,

                attempts:
                    Number(result.attempts) || 0,

                passed:
                    Boolean(result.passed),

                last_attempted_at:
                    result.last_attempted_at,
            }))
            .sort((a, b) => {
                /*
                 * Highest score first.
                 */
                if (b.score !== a.score) {
                    return b.score - a.score;
                }

                /*
                 * If scores are equal, fewer attempts
                 * gets the higher position.
                 */
                if (
                    a.attempts !==
                    b.attempts
                ) {
                    return (
                        a.attempts -
                        b.attempts
                    );
                }

                /*
                 * If both score and attempts are
                 * equal, most recent attempt comes first.
                 */
                return (
                    new Date(
                        b.last_attempted_at || 0
                    ).getTime() -
                    new Date(
                        a.last_attempted_at || 0
                    ).getTime()
                );
            })
            .map((student, index) => ({
                rank: index + 1,
                display_name:
                    student.display_name,
                score: student.score,
                attempts:
                    student.attempts,
                passed: student.passed,
            }));

        /*
         * ---------------------------------------------------------
         * 5. Return leaderboard
         * ---------------------------------------------------------
         */

        return NextResponse.json({
            ok: true,
            quiz_id: QUIZ_ID,
            leaderboard,
        });
    } catch (error) {
        console.error(
            "Leaderboard API exception:",
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