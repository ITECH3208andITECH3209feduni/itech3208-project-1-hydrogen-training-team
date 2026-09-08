// app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authUser";
import { supabaseServer } from "@/lib/supabase";

const VALID_CATEGORIES = [
    "Training Modules",
    "Scenarios / Simulations",
    "Quizzes",
    "Website / Navigation",
    "Technical Issue",
    "Other",
];

export async function POST(request: NextRequest) {
    try {
        // Verify that the requester is logged in
        const uid = await requireUser(request);

        const body = await request.json();

        const {
            rating,
            category,
            message,
        } = body;

        // Validate rating
        const numericRating = Number(rating);

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Please provide a rating between 1 and 5.",
                },
                { status: 400 }
            );
        }

        // Validate category
        if (
            typeof category !== "string" ||
            !VALID_CATEGORIES.includes(category)
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Please select a valid feedback category.",
                },
                { status: 400 }
            );
        }

        // Validate message
        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Please enter your feedback.",
                },
                { status: 400 }
            );
        }

        // Prevent excessively large submissions
        if (message.trim().length > 5000) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Feedback must be 5000 characters or less.",
                },
                { status: 400 }
            );
        }

        // Get the authenticated user's profile
        const {
            data: profile,
            error: profileError,
        } = await supabaseServer
            .from("profiles")
            .select("email")
            .eq("uid", uid)
            .single();

        if (profileError || !profile) {
            console.error(
                "FEEDBACK PROFILE ERROR:",
                profileError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Unable to identify your user profile.",
                },
                { status: 400 }
            );
        }

        // Save feedback
        const {
            data: feedback,
            error: insertError,
        } = await supabaseServer
            .from("feedback")
            .insert({
                user_id: uid,
                email: profile.email,
                rating: numericRating,
                category,
                message: message.trim(),
            })
            .select()
            .single();

        if (insertError) {
            console.error(
                "FEEDBACK INSERT ERROR:",
                insertError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: insertError.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            feedback,
        });

    } catch (error) {
        console.error(
            "FEEDBACK API ERROR:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Internal server error.";

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

        return NextResponse.json(
            {
                ok: false,
                error: "Unable to submit feedback.",
            },
            { status: 500 }
        );
    }
}