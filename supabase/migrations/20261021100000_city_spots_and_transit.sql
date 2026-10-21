-- Everyday city spots (ATMs, EV charging, parking, toilets, police, fire
-- stations) and public transport (metro, trains, ferries, buses).
--
-- Many of these have no name on OpenStreetMap, so a category can give a label
-- to use instead ("ATM", "Public toilet"). Categories without a label keep
-- skipping unnamed features, as before.
--
-- An osm_tags entry may now join several tags with "+", and all of them must
-- match: 'railway=station+station=subway' is a metro station, not any station.

alter table public.place_categories
  add column unnamed_label text check (char_length(unnamed_label) between 1 and 40);

comment on column public.place_categories.unnamed_label is
  'Name for OpenStreetMap features with no name, e.g. "ATM". Null skips unnamed features.';

-- ATMs and EV charging get their own categories.
update public.place_categories
   set name = 'Banks',
       description = 'Banks and money exchange',
       osm_tags = array['amenity=bank', 'amenity=bureau_de_change'],
       keywords = array['bank', 'money exchange', 'forex', 'currency exchange']
 where slug = 'banks';

update public.place_categories
   set name = 'Petrol pumps',
       description = 'Petrol, diesel and CNG',
       osm_tags = array['amenity=fuel'],
       keywords = array['petrol', 'diesel', 'petrol pump', 'petrol bunk', 'fuel', 'cng'],
       unnamed_label = 'Petrol pump'
 where slug = 'fuel';

insert into public.place_categories (slug, name, description, osm_tags, sort_order, keywords, unnamed_label) values
  ('atms', 'ATMs', 'Cash machines',
     array['amenity=atm'], 172,
     array['atm', 'cash', 'cash machine', 'withdraw'], 'ATM'),
  ('ev-charging', 'EV charging', 'Charging points for electric cars and scooters',
     array['amenity=charging_station'], 182,
     array['ev', 'ev charging', 'charging station', 'electric vehicle', 'charger'], 'EV charging point'),
  ('parking', 'Parking', 'Car and bike parking',
     array['amenity=parking', 'amenity=motorcycle_parking'], 190,
     array['parking', 'car park', 'bike parking', 'pay and park'], 'Parking'),
  ('toilets', 'Public toilets', 'Public toilets and restrooms',
     array['amenity=toilets'], 192,
     array['toilet', 'toilets', 'restroom', 'washroom', 'bathroom', 'loo'], 'Public toilet'),
  ('police', 'Police stations', 'Police stations and posts',
     array['amenity=police'], 194,
     array['police', 'police station', 'complaint', 'fir'], 'Police station'),
  ('fire-stations', 'Fire stations', 'Fire and rescue stations',
     array['amenity=fire_station'], 196,
     array['fire station', 'fire force', 'fire and rescue'], 'Fire station'),
  -- Transport. Metro comes before trains so metro stations are not filed as railway stations.
  ('metro', 'Metro', 'Metro stations',
     array['railway=station+station=subway', 'railway=station+station=light_rail'], 200,
     array['metro', 'metro station', 'kochi metro', 'kmrl'], null),
  ('trains', 'Train stations', 'Railway stations and halts',
     array['railway=station', 'railway=halt'], 210,
     array['train', 'railway', 'railway station', 'train station'], null),
  ('ferries', 'Ferries & Water Metro', 'Boat jetties, ferry terminals and Water Metro',
     array['amenity=ferry_terminal'], 220,
     array['ferry', 'boat', 'jetty', 'water metro', 'boat jetty'], null),
  ('buses', 'Buses', 'Bus stations and named bus stops',
     array['amenity=bus_station', 'highway=bus_stop'], 230,
     array['bus', 'bus stop', 'bus stand', 'bus station', 'ksrtc'], null);
