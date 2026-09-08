// app/api/admin/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    try {
        // Verify that the requester is an administrator
        await requireAdmin(request);

        // Retrieve feedback
        const {
            data: feedback,
            error,
        } = await supabaseServer
            .from("feedback")
            .select(
                "id, user_id, email, rating, category, message, created_at"
            )
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            console.error(
                "ADMIN FEEDBACK FETCH ERROR:",
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
            feedback: feedback ?? [],
        });

    } catch (error) {
        console.error(
            "ADMIN FEEDBACK API ERROR:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Unable to retrieve feedback.";

        if (
            message === "Missing authorization token"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: message,
                },
                { status: 401 }
            );
        }

        if (
            message === "Access denied"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: message,
                },
                { status: 403 }
            );
        }

        return NextResponse.json(
            {
                ok: false,
                error: "Unable to retrieve feedback.",
            },
            { status: 500 }
        );
    }
}