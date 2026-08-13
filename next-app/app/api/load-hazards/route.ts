// app/api/load-hazards/route.ts
// Returns all hotspot + hazard data from Supabase.
// Note: "left" is quoted because it is a reserved word.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const { data, error } = await supabase
        .from("hazards")
        .select(
            'type, title, text, top, "left", module_section, module_id, sort_order'
        )
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("load-hazards error:", error);

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
        data,
    });
}