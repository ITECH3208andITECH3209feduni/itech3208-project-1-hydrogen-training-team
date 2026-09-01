// app/api/quiz-requirements/route.ts
// Returns which module each quiz requires to be completed before it unlocks.
// Backed by the quiz_requirements table — see lib/quizRequirements.sql.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
	const { data, error } = await supabase
		.from('quiz_requirements')
		.select('quiz_id, required_module_id, section');

	if (error) {
		console.error('quiz-requirements error:', error);
		return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, data });
}
