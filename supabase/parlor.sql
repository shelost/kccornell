-- KCC parlor games (/play): live rooms for Imposter and Sketch.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- Also enable Authentication → Sign In / Providers → "Allow anonymous sign-ins".

create table if not exists public.parlor_rooms (
	code text primary key check (code ~ '^[A-Z0-9]{4}$'),
	state jsonb not null,
	version bigint not null default 1,
	updated_at timestamptz not null default now()
);

create table if not exists public.parlor_secrets (
	code text not null references public.parlor_rooms (code) on delete cascade,
	player_id uuid not null,
	card jsonb,
	primary key (code, player_id)
);

create index if not exists parlor_rooms_updated_at_idx on public.parlor_rooms (updated_at);
create index if not exists parlor_secrets_player_id_idx on public.parlor_secrets (player_id);

alter table public.parlor_rooms enable row level security;
alter table public.parlor_secrets enable row level security;

-- All writes go through the functions below.
revoke insert, update, delete on public.parlor_rooms from anon, authenticated;
revoke insert, update, delete on public.parlor_secrets from anon, authenticated;

drop policy if exists "Anyone can watch a room" on public.parlor_rooms;
create policy "Anyone can watch a room" on public.parlor_rooms
	for select to anon, authenticated
	using (true);

drop policy if exists "Players read only their own card" on public.parlor_secrets;
create policy "Players read only their own card" on public.parlor_secrets
	for select to authenticated
	using (player_id = (select auth.uid()));

create or replace function public.parlor_create(p_code text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	if auth.uid() is null or (p_state ->> 'hostId') is distinct from auth.uid()::text then
		raise exception 'Only the signed-in host can open this room';
	end if;
	delete from public.parlor_rooms where updated_at < now() - interval '2 days';
	insert into public.parlor_rooms (code, state) values (p_code, p_state);
end;
$$;

-- Applies a Firebase-style multi-path patch, e.g. {"players/abc/ready": true, "result": null},
-- atomically. Null values delete the path; missing parents are created as objects.
create or replace function public.parlor_patch(p_code text, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_state jsonb;
	v_key text;
	v_value jsonb;
	v_path text[];
	v_depth int;
begin
	if auth.uid() is null then
		raise exception 'Sign in first';
	end if;
	select state into v_state from public.parlor_rooms where code = p_code for update;
	if not found then
		raise exception 'Room not found';
	end if;
	for v_key, v_value in select key, value from jsonb_each(p_patch) loop
		v_path := array_remove(string_to_array(v_key, '/'), '');
		v_depth := coalesce(array_length(v_path, 1), 0);
		continue when v_depth = 0;
		for i in 1 .. v_depth - 1 loop
			if jsonb_typeof(v_state #> v_path[1:i]) is distinct from 'object' then
				v_state := jsonb_set(v_state, v_path[1:i], '{}'::jsonb, true);
			end if;
		end loop;
		if jsonb_typeof(v_value) = 'null' then
			v_state := v_state #- v_path;
		else
			v_state := jsonb_set(v_state, v_path, v_value, true);
		end if;
	end loop;
	update public.parlor_rooms
	set state = v_state, version = version + 1, updated_at = now()
	where code = p_code;
end;
$$;

-- Host-only: hands out private cards. Anyone not in p_cards has their card cleared.
create or replace function public.parlor_set_secrets(p_code text, p_cards jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	if not exists (
		select 1 from public.parlor_rooms
		where code = p_code and (state ->> 'hostId') = auth.uid()::text
	) then
		raise exception 'Only the host can deal cards';
	end if;
	insert into public.parlor_secrets (code, player_id, card)
	select p_code, key::uuid, value from jsonb_each(p_cards)
	on conflict (code, player_id) do update set card = excluded.card;
	update public.parlor_secrets
	set card = null
	where code = p_code and card is not null and not (p_cards ? player_id::text);
end;
$$;

revoke all on function public.parlor_create(text, jsonb) from public, anon;
revoke all on function public.parlor_patch(text, jsonb) from public, anon;
revoke all on function public.parlor_set_secrets(text, jsonb) from public, anon;
grant execute on function public.parlor_create(text, jsonb) to authenticated;
grant execute on function public.parlor_patch(text, jsonb) to authenticated;
grant execute on function public.parlor_set_secrets(text, jsonb) to authenticated;

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'parlor_rooms'
	) then
		alter publication supabase_realtime add table public.parlor_rooms;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'parlor_secrets'
	) then
		alter publication supabase_realtime add table public.parlor_secrets;
	end if;
end;
$$;
