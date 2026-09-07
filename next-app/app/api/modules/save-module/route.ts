// app/api/modules/save-module/route.ts
// Save module content to Supabase (top-level fields + sections)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminAuth';

type SectionInput = {
	num: string;
	heading: string;
	body: string;
	listType?: 'ul' | 'ol' | null;
	items?: string[] | null;
	callout?: string | null;
};

type ModuleInput = {
	id: string;
	slug: string | null;
	badgeNum: number | string | null;
	icon: string;
	iconBg: string;
	title: string;
	description: string;
	keyTakeaway: string;
	prevId: string | null;
	nextId: string | null;
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
		const section = body.section as string;
		const moduleInput = body.module as ModuleInput;
		const sections = (body.sections ?? []) as SectionInput[];

		if (!section || !moduleInput?.id) {
			return NextResponse.json(
				{ ok: false, error: 'Missing required "section" or "module.id"' },
				{ status: 400 }
			);
		}

		const rawBadge = moduleInput.badgeNum;
		const badgeNum = rawBadge === null || rawBadge === '' ? null : Number(rawBadge);

		// Step 1 — update the 'modules' table.
		const { error: upsertError } = await supabaseServer.from('modules').upsert(
			{
				section,
				id: moduleInput.id,
				slug: moduleInput.slug,
				badge_num: Number.isFinite(badgeNum) ? badgeNum : null,
				icon: moduleInput.icon,
				icon_bg: moduleInput.iconBg,
				title: moduleInput.title,
				description: moduleInput.description,
				key_takeaway: moduleInput.keyTakeaway,
				prev_id: moduleInput.prevId,
				next_id: moduleInput.nextId,
			},
			{ onConflict: 'section,id' }
		);

		if (upsertError) throw upsertError;

		// Step 2 — replace this module's sections only (not the whole 'module_sections' table).
		const { error: deleteError } = await supabaseServer
			.from('module_sections')
			.delete()
			.eq('section', section)
			.eq('module_id', moduleInput.id);

		if (deleteError) throw deleteError;

		if (sections.length > 0) {
			const rows = sections.map((s, index) => ({
				section,
				module_id: moduleInput.id,
				num: s.num,
				heading: s.heading,
				body: s.body,
				list_type: s.listType ?? null,
				items: s.items ?? null,
				callout: s.callout ?? null,
				sort_order: index,
			}));

			const { error: insertError } = await supabaseServer.from('module_sections').insert(rows);
			if (insertError) throw insertError;
		}

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('save-module error:', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}
