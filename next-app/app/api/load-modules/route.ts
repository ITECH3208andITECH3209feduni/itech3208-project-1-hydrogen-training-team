// app/api/load-modules/route.ts
// Returns content (title, sections, key takeaway, etc.) for a given module (found in the modules folder) from Supabase
// GET /api/load-modules?section=hazard-modules

// Backed by two tables:
//   - public.modules          — one row per module, keyed by (section, id)
//   - public.module_sections  — one row per numbered section within a module, keyed by (section, module_id, num), FK -> modules
//
// Note: status/progress are NOT stored in these tables — they belong to the separate per-user progress-tracking table.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
	const section = request.nextUrl.searchParams.get('section');

	if (!section) {
		return NextResponse.json(
			{ ok: false, error: 'Missing required "section" query param' },
			{ status: 400 }
		);
	}

	const { data, error } = await supabase
		.from('modules')
		.select(
			`id, slug, badge_num, icon, icon_bg, title, description, key_takeaway, prev_id, next_id, video_url, video_type, sort_order,
			 module_sections ( num, heading, body, list_type, items, callout, sort_order )`
		)
		.eq('section', section)
		.order('sort_order', { ascending: true })
		.order('sort_order', { ascending: true, foreignTable: 'module_sections' });

	if (error) {
		console.error('load-modules error:', error);
		return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, data });
}
