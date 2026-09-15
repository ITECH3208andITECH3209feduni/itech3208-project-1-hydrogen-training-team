// app/api/quizzes/save-quiz/route.ts
// Save quiz metadata + question bank to Supabase (top-level quiz fields + quiz_questions).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminAuth';

type QuestionInput = {
	id:           number;
	question:     string;
	options:      string[];
	correctIndex: number;
	explanation:  string;
	isCore?:      boolean;
};

type QuizInput = {
	title:         string;
	description:   string;
	passThreshold: number;
	poolSize?:     number | null;
};

function statusForAuthError(message: string): number {
	return ['Access denied', 'Missing authorization token', 'User profile not found'].includes(message) ? 403 : 500;
}

export async function POST(req: NextRequest) {
	try {
		await requireAdmin(req);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ ok: false, error: message }, { status: statusForAuthError(message) });
	}

	try {
		const body = await req.json();
		const quizId = body.quizId as string;
		const quizInput = body.quiz as QuizInput;
		const questions = (body.questions ?? []) as QuestionInput[];

		if (!quizId || !quizInput?.title) {
			return NextResponse.json(
				{ ok: false, error: 'Missing required "quizId" or "quiz.title"' },
				{ status: 400 }
			);
		}

		// Check each question has at least 2 options, one of them the answer.
		for (const q of questions) {
			if (!q.options || q.options.length < 2 || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
				return NextResponse.json(
					{ ok: false, error: `Question ${q.id} needs at least 2 options and a valid correctIndex` },
					{ status: 400 }
				);
			}
		}

		// Check the size of the question pool isn't smaller than the number of core questions.
		const coreCount = questions.filter((q) => q.isCore).length;
		const poolSize = quizInput.poolSize ?? null;

		if (poolSize != null && (!Number.isInteger(poolSize) || poolSize < 1)) {
			return NextResponse.json({ ok: false, error: 'poolSize must be a positive integer or null' }, { status: 400 });
		}
		if (poolSize != null && poolSize < coreCount) {
			return NextResponse.json(
				{ ok: false, error: `poolSize (${poolSize}) can't be less than the number of core questions (${coreCount})` },
				{ status: 400 }
			);
		}

		// Step 1 — update the 'quizzes' row
		const { error: upsertError } = await supabaseServer.from('quizzes').upsert(
			{
				quiz_id:        quizId,
				title:          quizInput.title,
				description:    quizInput.description,
				pass_threshold: quizInput.passThreshold,
				pool_size:      poolSize,
			},
			{ onConflict: 'quiz_id' }
		);

		if (upsertError) throw upsertError;

		// Step 2 — replace this quiz's questions only (not the whole 'quiz_questions' table)
		const { error: deleteError } = await supabaseServer.from('quiz_questions').delete().eq('quiz_id', quizId);

		if (deleteError) throw deleteError;

		if (questions.length > 0) {
			const rows = questions.map((q, index) => ({
				quiz_id:       quizId,
				id:            q.id,
				question:      q.question,
				options:       q.options,
				correct_index: q.correctIndex,
				explanation:   q.explanation,
				is_core:       !!q.isCore,
				sort_order:    index,
			}));

			const { error: insertError } = await supabaseServer.from('quiz_questions').insert(rows);
			if (insertError) throw insertError;
		}

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('save-quiz error:', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}