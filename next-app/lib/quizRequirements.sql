-- Run this once in the Supabase SQL editor (Owner access required).
-- Maps each quiz to the module that must be completed before it unlocks (AC2).

create table if not exists quiz_requirements (
	quiz_id text primary key,
	required_module_id text not null,
	section text not null default 'hazard-modules'
);

insert into quiz_requirements (quiz_id, required_module_id, section)
values ('hydrogen-hazards', '1', 'hazard-modules')
on conflict (quiz_id) do update set required_module_id = excluded.required_module_id;
