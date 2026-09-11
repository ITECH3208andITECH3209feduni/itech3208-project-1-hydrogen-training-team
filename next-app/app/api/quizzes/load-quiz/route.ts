// app/api/quizzes/load-quiz/route.ts
// Returns the question bank for a given quiz from Supabase.
// GET /api/load-quiz?quiz_id=hazards

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
	const quizId = request.nextUrl.searchParams.get('quiz_id');

	if (!quizId) {
		return NextResponse.json(
			{ ok: false, error: 'Missing required "quiz_id" query param' },
			{ status: 400 }
		);
	}

	const { data, error } = await supabase
		.from('quizzes')
		.select(
			`quiz_id, title, description, pass_threshold, sort_order,
			 quiz_questions ( id, question, options, correct_index, explanation, sort_order )`
		)
		.eq('quiz_id', quizId)
		.order('sort_order', { ascending: true, referencedTable: 'quiz_questions' })
		.maybeSingle();

	if (error) {
		console.error('load-quiz error:', error);
		return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, data });
}