// lib/progressLock.ts
// Server-side authority for progression locking (AC3). Mirrors the client-side
// checks in lib/moduleTypes.ts (isModuleLocked) and hooks/useQuizLock.ts, but
// runs on the server so a direct API call can't bypass what the UI hides.

import { supabase, supabaseServer } from './supabase';
import { hazardModules } from './hazardModules';
import { getModuleById } from './moduleTypes';

// Resolves a module's prevId, preferring admin-authored Supabase content over
// the static defaults — matches the merge hooks/useModules.ts does client-side.
async function resolvePrevId(section: string, moduleId: string): Promise<string | null> {
	const { data } = await supabase
		.from('modules')
		.select('prev_id')
		.eq('section', section)
		.eq('id', moduleId)
		.maybeSingle();

	if (data) return data.prev_id ?? null;

	const fallback = section === 'hazard-modules' ? getModuleById(hazardModules, moduleId) : undefined;
	return fallback?.prevId ?? null;
}

// True if this module's prerequisite isn't done yet for this user.
// Fails open (unlocked) when there's no prerequisite or a lookup error —
// a locking bug should never be able to trap someone out of everything.
export async function isModuleLockedForUser(
	uid: string,
	section: string,
	moduleId: string
): Promise<boolean> {
	const prevId = await resolvePrevId(section, moduleId);
	if (!prevId) return false;

	const { data, error } = await supabaseServer
		.from('user_module_progress')
		.select('status')
		.eq('uid', uid)
		.eq('module_id', prevId)
		.maybeSingle();

	if (error) {
		console.error('isModuleLockedForUser lookup error:', error);
		return false;
	}

	return (data?.status ?? 'todo') !== 'done';
}

// True if this quiz's required module isn't done yet for this user.
// Fails open if quiz_requirements has no row for this quiz — including when
// the table doesn't exist yet, before the migration in lib/quizRequirements.sql
// has been run.
export async function isQuizLockedForUser(uid: string, quizId: string): Promise<boolean> {
	const { data: requirement, error: reqError } = await supabase
		.from('quiz_requirements')
		.select('required_module_id')
		.eq('quiz_id', quizId)
		.maybeSingle();

	if (reqError || !requirement) return false;

	const { data, error } = await supabaseServer
		.from('user_module_progress')
		.select('status')
		.eq('uid', uid)
		.eq('module_id', requirement.required_module_id)
		.maybeSingle();

	if (error) {
		console.error('isQuizLockedForUser lookup error:', error);
		return false;
	}

	return (data?.status ?? 'todo') !== 'done';
}
