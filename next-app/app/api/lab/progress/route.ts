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
                "GET lab progress error:",
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

        const { count: totalHotspotCount, error: countError } =
            await supabaseServer
                .from("hotspots")
                .select("*", {
                    count: "exact",
                    head: true,
                });

        if (countError) {
            console.error(
                "GET hotspot count error:",
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
            completedHotspots: data?.length ?? 0,
            totalHotspots: totalHotspotCount ?? 0,
        });
    } catch (error) {
        console.error(
            "GET hotspot progress exception:",
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

        const hotspotId =
            typeof body.hotspotId === "string"
                ? body.hotspotId.trim()
                : "";

        if (!hotspotId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "hotspotId is required",
                },
                { status: 400 }
            );
        }

        /*
         * Confirm that this hotspot actually exists.
         */
        const {
            data: hotspot,
            error: hotspotError,
        } = await supabaseServer
            .from("hotspots")
            .select("type")
            .eq("type", hotspotId)
            .maybeSingle();

        if (hotspotError) {
            console.error(
                "Hotspot lookup error:",
                hotspotError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: hotspotError.message,
                },
                { status: 500 }
            );
        }

        if (!hotspot) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Unknown hotspot",
                },
                { status: 400 }
            );
        }

        const { error } = await supabaseServer
            .from("user_lab_progress")
            .upsert(
                {
                    uid,
                    hotspot_id: hotspotId,
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
                "Save hotspot progress error:",
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
            message: "Hotspot progress recorded",
        });
    } catch (error) {
        console.error(
            "POST hotspot progress exception:",
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