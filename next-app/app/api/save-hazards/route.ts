// app/api/save-hazards/route.ts
// Saves the current hotspot state to Supabase.
// Deletes existing rows first, then recreates them from the current UI state.
// Uses supabaseServer because this is a server-side write operation.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type HazardDataEntry = {
    title: string;
    text: string;
    moduleId: string | null;
    moduleSection: string | null;
};

type Hotspot = {
    type: string;
    top: string;
    left: string;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const hotspots = (body.hotspots ?? []) as Hotspot[];

        const hazardData = (body.hazardData ?? {}) as Record<string, HazardDataEntry>;

        // Step 1 — delete existing rows
        const { error: deleteError } =
            await supabaseServer
                .from("hazards")
                .delete()
                .neq("type", "");   // .neq with an always-true condition deletes all rows

        if (deleteError) {
            throw deleteError;
        }

        // Step 2 — recreate current hotspot set
        if (hotspots.length > 0) {
            const rows = hotspots.map(
                (hotspot, index) => {
                    const info =
                        hazardData[hotspot.type];

                    return {
                        type: hotspot.type,
                        top: hotspot.top,
                        left: hotspot.left,
                        title: info?.title ?? "",
                        text: info?.text ?? "",
                        module_section:
                            info?.moduleSection ?? null,
                        module_id:
                            info?.moduleId ?? null,
                        sort_order: index,
                    };
                }
            );

            const { error: insertError } =
                await supabaseServer
                    .from("hazards")
                    .insert(rows);

            if (insertError) {
                throw insertError;
            }
        }

        return NextResponse.json({
            ok: true,
        });
    } catch (err) {
        console.error(
            "save-hazards error:",
            err
        );

        return NextResponse.json(
            {
                ok: false,
                error: String(err),
            },
            { status: 500 }
        );
    }
}