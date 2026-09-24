// app/api/lab/load-hotspots/route.ts
// Returns all hotspot data from Supabase.
// Note: "left" is quoted because it is a reserved word.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
	const { data, error } = await supabase
		.from('hotspots')
		.select('type, title, text, top, "left", module_topic, module_id, video_url, video_type, sort_order')
		.order('sort_order', { ascending: true });
	
	if (error) {
		console.error('load-hotspots error:', error);
		return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	}
	
	return NextResponse.json({ ok: true, data });
}
