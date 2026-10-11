// lib/progressLock.ts
// Server-side authority for progression locking (AC3). Mirrors the client-side
// checks in lib/modules/moduleTypes.ts (isModuleLocked) and hooks/useQuizLock.ts, but
// runs on the server so a direct API call can't bypass what the UI hides.

import { supabase, supabaseServer } from './supabase';
import { hazardModules } from './modules/hazards';
import { getModuleById } from './modules/moduleTypes';

// Resolves a module's prevId, preferring admin-authored Supabase content over
// the static defaults — matches the merge hooks/modules/useModules.ts does client-side.
async function resolvePrevId(topic: string, moduleId: string): Promise<string | null> {
	const { data } = await supabase
		.from('modules')
		.select('prev_id')
		.eq('topic', topic)
		.eq('id', moduleId)
		.maybeSingle();

	if (data) return data.prev_id ?? null;

	const fallback = topic === 'hazards' ? getModuleById(hazardModules, moduleId) : undefined;
	return fallback?.prevId ?? null;
}

// True if this module's prerequisite isn't done yet for this user.
// Fails open (unlocked) when there's no prerequisite or a lookup error —
// a locking bug should never be able to trap someone out of everything.
export async function isModuleLockedForUser(
	uid: string,
	topic: string,
	moduleId: string
): Promise<boolean> {
	const prevId = await resolvePrevId(topic, moduleId);
	if (!prevId) return false;

	const { data, error } = await supabaseServer
		.from('user_module_progress')
		.select('status')
		.eq('uid', uid)
		.eq('topic', topic)
		.eq('module_id', prevId)
		.maybeSingle();

	if (error) {
		console.error('isModuleLockedForUser lookup error:', error);
		return false;
	}

	return (data?.status ?? 'todo') !== 'done';
}

// Module ids that make up a topic, preferring admin-authored Supabase content
// over the static defaults — same source the client-side quiz lock uses.
async function resolveTopicModuleIds(topic: string): Promise<string[]> {
	const { data, error } = await supabase
		.from('modules')
		.select('id')
		.eq('topic', topic);

	if (!error && data?.length) return data.map((row) => String(row.id));

	return topic === 'hazards' ? hazardModules.map((m) => String(m.id)) : [];
}

// True unless every module in the quiz's topic is done for this user.
// Fails closed (locked) on a lookup error, matching hooks/useQuizLock.ts.
export async function isQuizLockedForUser(uid: string, topic: string): Promise<boolean> {
	const moduleIds = await resolveTopicModuleIds(topic);
	if (!moduleIds.length) return false;

	const { data, error } = await supabaseServer
		.from('user_module_progress')
		.select('module_id, status, progress')
		.eq('uid', uid)
		.eq('topic', topic);

	if (error) {
		console.error('isQuizLockedForUser lookup error (failing closed):', error);
		return true;
	}

	const doneIds = new Set(
		(data ?? [])
			.filter((row) => row.status === 'done' || Number(row.progress ?? 0) >= 100)
			.map((row) => String(row.module_id))
	);

	return moduleIds.some((id) => !doneIds.has(id));
}
