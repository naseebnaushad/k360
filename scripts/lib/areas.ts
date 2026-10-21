/**
 * Links every place in a city to its nearest area (neighbourhood), so the
 * "Area" filter works for places whose address does not name one.
 */
import { queryLinked as query } from "./supabase-cli.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Places farther than this from every area centre are left without one. */
export const AREA_MAX_DISTANCE_M = 3000;

export async function assignPlaceAreas(
  cityId: string,
): Promise<{ assigned: number; total: number }> {
  if (!UUID_PATTERN.test(cityId)) throw new Error(`Invalid city id: ${cityId}`);

  await query(
    `with nearest as (
       select p.id,
              (select a.id
                 from public.areas a
                where a.city_id = p.city_id
                  and extensions.st_dwithin(a.location, p.location, ${AREA_MAX_DISTANCE_M})
                order by a.location operator(extensions.<->) p.location
                limit 1) as area_id
         from public.places p
        where p.city_id = '${cityId}'
     )
     update public.places p
        set area_id = n.area_id
       from nearest n
      where p.id = n.id and p.area_id is distinct from n.area_id;`,
  );

  const [counts] = await query<{ assigned: number; total: number }>(
    `select count(area_id)::int as assigned, count(*)::int as total
       from public.places where city_id = '${cityId}';`,
  );
  return counts ?? { assigned: 0, total: 0 };
}
