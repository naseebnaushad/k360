-- Reference data: the starting set of place categories.
-- Add or adjust categories with new migrations; the OSM importer reads osm_tags.

insert into public.place_categories (slug, name, description, osm_tags, sort_order) values
  ('restaurants',   'Restaurants',           'Restaurants and eateries',                  array['amenity=restaurant', 'amenity=fast_food', 'amenity=food_court'], 10),
  ('cafes',         'Cafés & tea shops',     'Cafés, tea shops and juice bars',          array['amenity=cafe', 'shop=tea', 'amenity=ice_cream'], 20),
  ('bakeries',      'Bakeries & sweets',     'Bakeries, confectioneries and sweet shops', array['shop=bakery', 'shop=confectionery', 'shop=pastry'], 30),
  ('groceries',     'Groceries',             'Supermarkets, grocery and convenience stores', array['shop=supermarket', 'shop=convenience', 'shop=grocery', 'shop=greengrocer', 'shop=butcher', 'shop=seafood'], 40),
  ('florists',      'Florists & plants',     'Flower shops, nurseries and garden centres', array['shop=florist', 'shop=garden_centre'], 50),
  ('pharmacies',    'Pharmacies',            'Pharmacies and chemists',                  array['amenity=pharmacy', 'shop=chemist'], 60),
  ('healthcare',    'Hospitals & clinics',   'Hospitals, clinics, doctors and dentists', array['amenity=hospital', 'amenity=clinic', 'amenity=doctors', 'amenity=dentist'], 70),
  ('clothing',      'Clothing & textiles',   'Clothing, textiles, tailors and shoes',    array['shop=clothes', 'shop=fabric', 'shop=tailor', 'shop=shoes', 'shop=boutique'], 80),
  ('jewellery',     'Jewellery',             'Jewellery and watch shops',                array['shop=jewelry', 'shop=watches'], 90),
  ('electronics',   'Electronics & mobiles', 'Electronics, mobile phones and computers', array['shop=electronics', 'shop=mobile_phone', 'shop=computer', 'shop=appliance'], 100),
  ('hardware',      'Hardware & home',       'Hardware, furniture and home improvement', array['shop=hardware', 'shop=doityourself', 'shop=furniture', 'shop=paint', 'shop=houseware'], 110),
  ('books',         'Books & stationery',    'Bookshops and stationery',                 array['shop=books', 'shop=stationery'], 120),
  ('beauty',        'Beauty & salons',       'Salons, barbers and cosmetics',            array['shop=beauty', 'shop=hairdresser', 'shop=cosmetics'], 130),
  ('fitness',       'Gyms & fitness',        'Gyms, fitness centres and sports',         array['leisure=fitness_centre', 'leisure=sports_centre', 'shop=sports'], 140),
  ('hotels',        'Hotels & stays',        'Hotels, guest houses and homestays',       array['tourism=hotel', 'tourism=guest_house', 'tourism=hostel', 'tourism=apartment'], 150),
  ('attractions',   'Attractions',           'Museums, viewpoints and sights',           array['tourism=attraction', 'tourism=museum', 'tourism=viewpoint', 'tourism=gallery', 'historic=fort', 'historic=monument'], 160),
  ('banks',         'Banks & ATMs',          'Banks, ATMs and money exchange',           array['amenity=bank', 'amenity=atm', 'amenity=bureau_de_change'], 170),
  ('fuel',          'Fuel & EV charging',    'Petrol pumps and charging stations',       array['amenity=fuel', 'amenity=charging_station'], 180)
on conflict (slug) do nothing;
