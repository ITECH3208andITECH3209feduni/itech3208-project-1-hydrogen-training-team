// app/api/quiz-requirements/route.ts
// Returns which module each quiz requires to be completed before it unlocks.
// Backed by the quiz_requirements table — see supabase_setup.sql.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Always query live — otherwise a production build can freeze the response at build time.
export const dynamic = "force-dynamic";

export async function GET() {
	const { data, error } = await supabase
		.from('quiz_requirements')
		.select('quiz_id, required_module_id, topic');

	if (error) {
		console.error('quiz-requirements error:', error);
		return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, data });
}
