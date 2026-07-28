import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify that the caller is an authenticated admin
    await requireAdmin(request);

    const { data, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .order("email");

    if (error) {
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

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error.",
      },
      { status: 403 }
    );
  }
}