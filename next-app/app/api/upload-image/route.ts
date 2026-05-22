// app/api/upload-image/route.ts
// Accepts a multipart form upload and saves the image to Supabase Storage.
// Always saves as 'lab.jpg' so the filename stays consistent.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		const file = formData.get('image') as File | null;
		
		if (!file) {
			return NextResponse.json({ ok: false, error: 'No image provided' }, { status: 400 });
		}
		
		// Validate file type
		if (!file.type.startsWith('image/')) {
			return NextResponse.json({ ok: false, error: 'File must be an image' }, { status: 400 });
		}
		
		const buffer = Buffer.from(await file.arrayBuffer());
		
		// Upload to Supabase Storage, overwriting the existing lab.jpg
		const { error } = await supabaseServer.storage
			.from('lab-images')
			.upload('lab.jpg', buffer, {
				contentType: file.type,
				upsert: true,   // Overwrite if exists
			});
		
		if (error) throw error;

		// Return the public URL of the uploaded image
		const { data } = supabaseServer.storage
			.from('lab-images')
			.getPublicUrl('lab.jpg');
		
		return NextResponse.json({ ok: true, url: data.publicUrl });
	} catch (err) {
		console.error('upload-image error:', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}
