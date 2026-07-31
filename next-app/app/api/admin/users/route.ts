import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify the requester is an authenticated admin
    await requireAdmin(request);

    const { data, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .order("email");

    if (error) {
      console.error("SUPABASE ERROR:", error);

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
      users: data,
    });
  } catch (err) {
    console.error("ADMIN USERS API FAILED:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}