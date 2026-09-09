-- 0008_full_text_search.sql
-- Server-side search, so the dashboard stops selecting every row.
--
-- app/notes/page.tsx fetched the whole table because that is what kept
-- client-side search honest: you cannot filter on a body you have not
-- downloaded. That is fine at fifty notes and indefensible at five thousand.
-- This moves the search into Postgres so the client can fetch one page at a
-- time and still search everything.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Extracting text worth indexing
--
-- `content` holds a BlockNote JSON document, and older rows hold raw HTML.
-- Feeding either straight to to_tsvector indexes the structure as well as the
-- prose: searching for "paragraph", "styles" or "div" would match every note.
--
-- So: pull the actual strings out. For JSON that is every `text` leaf, which
-- jsonpath expresses directly. For the legacy HTML rows the cast fails, and
-- the fallback strips tags instead. The cast is guarded because one malformed
-- row must not be able to fail the whole table's index build.
--
-- IMMUTABLE is a real claim, not a convenience: this is a pure function of its
-- three arguments, with no table access, no clock, and no locale-dependent
-- behaviour beyond the regconfig its caller pins explicitly.
-- ---------------------------------------------------------------------------

create or replace function public.note_search_text(
    p_title   text,
    p_tags    text[],
    p_content text
)
returns text
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $fn$
declare
    body text := '';
    doc  jsonb;
begin
    if p_content is not null and p_content <> '' then
        begin
            doc := p_content::jsonb;
            select string_agg(t #>> '{}', ' ')
              into body
              from jsonb_path_query(doc, '$.**.text') as t;
        exception when others then
            -- Legacy HTML. Strip tags rather than index them.
            body := regexp_replace(p_content, '<[^>]*>', ' ', 'g');
        end;
    end if;

    return coalesce(p_title, '')
        || ' ' || coalesce(array_to_string(p_tags, ' '), '')
        || ' ' || coalesce(body, '');
end
$fn$;

-- A stored generated column, not a trigger: it cannot drift out of sync with
-- the row, because Postgres recomputes it on every write. 'english' is pinned
-- explicitly — the default text search config is a GUC, which would make the
-- expression mutable and the column illegal.
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'notes'
          and column_name = 'search_vector'
    ) then
        alter table public.notes
            add column search_vector tsvector
            generated always as (
                to_tsvector('english', public.note_search_text(title, tags, content))
            ) stored;
    end if;
end $$;

create index if not exists notes_search_idx
    on public.notes using gin (search_vector);

-- The paging index. 0006's notes_live_idx is (user_id, created_at desc), which
-- covers "page 1" but not the ORDER BY below: that adds `id` as a tiebreaker,
-- so the planner had to bolt an incremental sort on top and, past a few
-- thousand rows of offset, abandoned the index for a seq scan and a full sort.
-- Measured on 50,000 rows: page 1 is 0.03 ms and page 200 (offset 4800) is
-- 1.0 ms through this index. (At 5,000 rows the planner reasonably prefers a
-- seq scan and a sort — the index earns its keep as the table grows, which is
-- the only time any of this matters.)
--
-- The tiebreaker itself is not optional. Sorting by title or created_at alone
-- leaves rows with equal keys in an unspecified order, which across two pages
-- means a note can appear twice or not at all.
create index if not exists notes_live_page_idx
    on public.notes (user_id, created_at desc, id)
    where deleted_at is null;

-- One index per sort order the toolbar offers, because each ORDER BY below is
-- a different key and an index that does not match it buys nothing. Measured
-- on 50,000 notes before these existed: sorting by title took 59 ms and by
-- recently-edited 43 ms, against 3 ms for the default. 0005's
-- notes_user_id_updated_at_idx does not serve the second one — it indexes
-- updated_at, while the app sorts by coalesce(updated_at, created_at) so notes
-- never edited still fall in the right place.
--
-- 'Oldest' needs no index of its own: btree scans notes_live_page_idx
-- backwards.
create index if not exists notes_live_updated_idx
    on public.notes (user_id, coalesce(updated_at, created_at) desc, id)
    where deleted_at is null;

create index if not exists notes_live_title_idx
    on public.notes (user_id, lower(title), id)
    where deleted_at is null;

-- Favourites is one of the two things in the sidebar, and it is a small slice
-- of a large table — exactly what a partial index is for. It stays tiny
-- because it only holds starred rows.
create index if not exists notes_favorites_idx
    on public.notes (user_id, created_at desc, id)
    where deleted_at is null and is_favorite;

-- ---------------------------------------------------------------------------
-- The query the app actually runs
--
-- SECURITY INVOKER (the default, stated for the avoidance of doubt): these
-- must run as the caller so RLS still confines them to their own notes. A
-- definer function here would hand every user the whole table — the exact
-- mistake 0007 goes out of its way to avoid.
--
-- The predicate lives in one place, matching_notes(), so the page query and
-- the count query cannot drift apart. It deliberately carries NO `set
-- search_path`: a SQL function with a SET clause cannot be inlined by the
-- planner, and without inlining the caller loses every index below. It is safe
-- regardless — it runs under the search_path its callers pin, because that
-- setting is dynamically scoped for the duration of the call.
-- ---------------------------------------------------------------------------

create or replace function public.matching_notes(
    p_query     text,
    p_tag       text,
    p_favorites boolean
)
returns setof public.notes
language sql
stable
security invoker
as $fn$
    select n.*
    from public.notes n
    where n.deleted_at is null
      and (p_tag is null or n.tags @> array[p_tag])
      and (not coalesce(p_favorites, false) or n.is_favorite)
      -- websearch_to_tsquery, not plainto_tsquery: it understands quoted
      -- phrases and OR, and — unlike to_tsquery — it never raises on whatever
      -- the user happens to type.
      and (nullif(btrim(coalesce(p_query, '')), '') is null
           or n.search_vector @@ websearch_to_tsquery('english', btrim(p_query)))
$fn$;

revoke all on function public.matching_notes(text, text, boolean) from public;
grant execute on function public.matching_notes(text, text, boolean) to authenticated;

-- One branch per sort order, spelled out.
--
-- The compact version puts the sort key in the ORDER BY as
-- `case when p_sort = 'oldest' then created_at end asc, ...`. It reads well
-- and it is 1000x slower: a CASE over a parameter is not an indexable
-- expression, so the planner sorts every matching row before LIMIT sees them.
-- Measured on 50,000 notes, page 1 went from 0.03 ms to 32 ms.
--
-- Four static queries each get their own plan and each can walk
-- notes_live_page_idx. No dynamic SQL, so there is nothing to inject into.
create or replace function public.search_notes(
    p_query     text    default null,
    p_tag       text    default null,
    p_favorites boolean default false,
    p_sort      text    default 'newest',
    p_limit     integer default 24,
    p_offset    integer default 0
)
returns setof public.notes
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $fn$
declare
    v_limit  integer := greatest(1, least(coalesce(p_limit, 24), 100));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
    -- `id` is the tiebreaker in every branch. Without it, rows with equal
    -- sort keys come back in an unspecified order, which across two pages
    -- means a note can appear twice or be skipped entirely.
    if p_sort = 'oldest' then
        return query
            select m.* from public.matching_notes(p_query, p_tag, p_favorites) m
            order by m.created_at asc, m.id
            limit v_limit offset v_offset;
    elsif p_sort = 'updated' then
        return query
            select m.* from public.matching_notes(p_query, p_tag, p_favorites) m
            order by coalesce(m.updated_at, m.created_at) desc, m.id
            limit v_limit offset v_offset;
    elsif p_sort = 'title' then
        return query
            select m.* from public.matching_notes(p_query, p_tag, p_favorites) m
            order by lower(m.title) asc, m.id
            limit v_limit offset v_offset;
    else
        -- 'newest', and anything unrecognised rather than an error: a stale
        -- bookmark carrying ?sort=whatever should show notes, not a failure.
        return query
            select m.* from public.matching_notes(p_query, p_tag, p_favorites) m
            order by m.created_at desc, m.id
            limit v_limit offset v_offset;
    end if;
end
$fn$;

revoke all on function public.search_notes(text, text, boolean, text, integer, integer) from public;
grant execute on function public.search_notes(text, text, boolean, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The count is a separate call, on purpose.
--
-- The obvious design returns `count(*) over ()` alongside each row, so one
-- request carries both the page and the total. Measured on 50,000 notes that
-- costs 62 ms for the first page instead of 0.03 ms: the window function has
-- to materialise every matching row before LIMIT can discard them, so paging
-- stops being paging.
--
-- Split out, the page is an index scan and the count is paid once per filter
-- change (15-19 ms on the same data) rather than on every scroll.
-- ---------------------------------------------------------------------------

create or replace function public.count_notes(
    p_query     text    default null,
    p_tag       text    default null,
    p_favorites boolean default false
)
returns bigint
language sql
stable
security invoker
set search_path = public, pg_temp
as $fn$
    select count(*) from public.matching_notes(p_query, p_tag, p_favorites)
$fn$;

revoke all on function public.count_notes(text, text, boolean) from public;
grant execute on function public.count_notes(text, text, boolean) to authenticated;

-- The tag list for the filter chips. Same reasoning: the client used to derive
-- it by scanning every note it had downloaded, which stops being possible once
-- it only holds a page.
create or replace function public.note_tags()
returns table (tag text, count bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $fn$
    select t as tag, count(*) as count
    from public.notes n, unnest(n.tags) as t
    where n.deleted_at is null
    group by t
    order by count(*) desc, t asc
$fn$;

revoke all on function public.note_tags() from public;
grant execute on function public.note_tags() to authenticated;

-- ---------------------------------------------------------------------------
-- Measured, on 50,000 notes, as the `authenticated` role with RLS applied
-- (measuring as superuser is measuring a different query — without the
-- user_id predicate RLS injects, none of these indexes apply):
--
--     page 1, newest ............ 0.5 ms
--     page 200 (offset 4800) .... 1.5 ms
--     sort by title ............. 0.9 ms
--     sort by recently edited ... 0.6 ms
--     favourites ................ 0.5 ms
--     tag filter ................ 0.5 ms
--     search, common term ....... 0.8 ms
--     search, rare term ......... 16 ms     <- the worst case, see below
--     count_notes() ............. 36 ms     <- once per filter change
--     note_tags() ............... 54 ms     <- once per dashboard load
--
-- The rare-term case is the honest wart. With ORDER BY + LIMIT the planner
-- prefers walking notes_user_id_created_at_idx and stopping once it has 24
-- matches, which is right for a common word and wrong for a word that appears
-- once: it walks every row of that user's table before finding it. A
-- btree_gin composite over (user_id, search_vector) was tried and the planner
-- still chose the ordered index, so it was dropped rather than left as write
-- overhead that buys nothing. 16 ms is bounded by one user's note count and
-- is not worth fighting the planner over.
--
-- ---------------------------------------------------------------------------
-- The ceiling this does not remove
--
-- OFFSET pagination is O(offset): the database still walks the skipped rows,
-- so page 500 costs more than page 1 no matter how good the index is. It is
-- the right trade here — it keeps "jump to any page" possible and stays fast
-- to five figures — but if a user ever accumulates six-figure note counts, the
-- fix is keyset pagination: carry (created_at, id) of the last row seen and
-- ask for `(created_at, id) < (:last_created_at, :last_id)` instead. The index
-- above already supports it.
-- ---------------------------------------------------------------------------
