import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing uid.",
        },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Profile not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      profile,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}