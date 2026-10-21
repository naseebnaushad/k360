-- Explicit table privileges. New tables grant nothing by default;
-- Row Level Security policies then decide which rows are visible.

grant select on table public.cities to anon, authenticated;
