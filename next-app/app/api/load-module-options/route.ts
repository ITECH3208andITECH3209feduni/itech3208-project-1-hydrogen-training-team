// app/api/load-module-options/route.ts
// Returns a list of modules to connect to a hotspot for the lab page's edit-mode.
// GET /api/load-module-options

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
	const { data, error } = await supabase
		.from('modules')
		.select('section, id, badge_num, title')
		.order('section', { ascending: true })
		.order('sort_order', { ascending: true });

	if (error) {
		console.error('load-module-options error:', error);
		return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, data });
}
