// app/api/save-hazards/route.ts
// Saves the current hotspot state to Supabase.
// Deletes all existing rows first, then reinserts the current set — ensuring deleted hotspots are removed and the database exactly mirrors the UI state.
// Uses supabaseServer (secret key) since this is a write operation on the server

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
	try {
		const { hotspots, hazardData } = await req.json();
		
		// Step 1 — delete all existing rows
		const { error: deleteError } = await supabaseServer
			.from('hazards')
			.delete()
			.neq('type', '');   // .neq with an always-true condition deletes all rows
		
		if (deleteError) throw deleteError;
		
		// Step 2 — reinsert the current set (skip if there are no hotspots)
		if ((hotspots as []).length > 0) {
			const rows = (hotspots as { type: string; top: string; left: string }[]).map(
				(hs, index) => ({
					type:           hs.type,
					top:            hs.top,
					left:           hs.left,
					title:          (hazardData as Record<string, { title: string; text: string; moduleId: string | null; moduleSection: string | null }>)[hs.type].title,
					text:           (hazardData as Record<string, { title: string; text: string; moduleId: string | null; moduleSection: string | null }>)[hs.type].text,
					module_section: (hazardData as Record<string, { title: string; text: string; moduleId: string | null; moduleSection: string | null }>)[hs.type].moduleSection,
					module_id:      (hazardData as Record<string, { title: string; text: string; moduleId: string | null; moduleSection: string | null }>)[hs.type].moduleId,
					sort_order:     index,
				})
			);
			
			const { error: insertError } = await supabaseServer
				.from('hazards')
				.insert(rows);

			if (insertError) throw insertError;
		}
		
		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('save-hazards error:', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}
