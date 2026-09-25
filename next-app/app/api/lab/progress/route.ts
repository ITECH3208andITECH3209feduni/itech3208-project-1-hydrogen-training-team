// app/api/lab/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/firebase/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCENARIO_ID = "interactive-lab";

/* ---------------- GET ---------------- */

export async function GET(request: NextRequest) {
    try {
        const uid = await requireUser(request);

        const { data, error } = await supabaseServer
            .from("user_lab_progress")
            .select("hotspot_id, first_clicked_at")
            .eq("uid", uid)
            .eq("scenario_id", SCENARIO_ID);

        if (error) {
            console.error(
                "GET hazard progress error:",
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

        const { count: totalHazards, error: countError } =
            await supabaseServer
                .from("hotspots")
                .select("*", {
                    count: "exact",
                    head: true,
                });

        if (countError) {
            console.error(
                "GET hazard count error:",
                countError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: countError.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            progress: data ?? [],
            completedHazards: data?.length ?? 0,
            totalHazards: totalHazards ?? 0,
        });
    } catch (error) {
        console.error(
            "GET hazard progress exception:",
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

        const hazardId =
            typeof body.hazardId === "string"
                ? body.hazardId.trim()
                : "";

        if (!hazardId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "hazardId is required",
                },
                { status: 400 }
            );
        }

        /*
         * Confirm that this hazard actually exists.
         */
        const {
            data: hazard,
            error: hazardError,
        } = await supabaseServer
            .from("hotspots")
            .select("type")
            .eq("type", hazardId)
            .maybeSingle();

        if (hazardError) {
            console.error(
                "Hazard lookup error:",
                hazardError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: hazardError.message,
                },
                { status: 500 }
            );
        }

        if (!hazard) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Unknown hazard",
                },
                { status: 400 }
            );
        }

        const { error } = await supabaseServer
            .from("user_lab_progress")
            .upsert(
                {
                    uid,
                    hotspot_id: hazardId,
                    scenario_id: SCENARIO_ID,
                },
                {
                    onConflict:
                        "uid,scenario_id,hotspot_id",
                    ignoreDuplicates: true,
                }
            );

        if (error) {
            console.error(
                "Save hazard progress error:",
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
            message: "Hazard progress recorded",
        });
    } catch (error) {
        console.error(
            "POST hazard progress exception:",
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


