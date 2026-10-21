import {
  Banknote,
  BedDouble,
  BookOpen,
  Bus,
  Coffee,
  CreditCard,
  Croissant,
  Dumbbell,
  Flame,
  Flower2,
  Fuel,
  Gem,
  Hammer,
  Landmark,
  type LucideIcon,
  Pill,
  PlugZap,
  Scissors,
  ShieldCheck,
  Ship,
  Shirt,
  ShoppingBasket,
  Smartphone,
  SquareParking,
  Stethoscope,
  Store,
  Toilet,
  TrainFront,
  TrainTrack,
  Utensils,
} from "lucide-react";

/**
 * Icons for the built-in categories. Categories added later without an entry
 * here get the generic store icon, so new data never breaks the UI.
 */
const ICONS: Record<string, LucideIcon> = {
  restaurants: Utensils,
  cafes: Coffee,
  bakeries: Croissant,
  groceries: ShoppingBasket,
  florists: Flower2,
  pharmacies: Pill,
  healthcare: Stethoscope,
  clothing: Shirt,
  jewellery: Gem,
  electronics: Smartphone,
  hardware: Hammer,
  books: BookOpen,
  beauty: Scissors,
  fitness: Dumbbell,
  hotels: BedDouble,
  attractions: Landmark,
  banks: Banknote,
  fuel: Fuel,
  atms: CreditCard,
  "ev-charging": PlugZap,
  parking: SquareParking,
  toilets: Toilet,
  police: ShieldCheck,
  "fire-stations": Flame,
  metro: TrainFront,
  trains: TrainTrack,
  ferries: Ship,
  buses: Bus,
};

const SIZES = {
  sm: { box: "size-9 rounded-xl", icon: "size-4" },
  md: { box: "size-11 rounded-2xl", icon: "size-5" },
  lg: { box: "size-14 rounded-2xl", icon: "size-6" },
} as const;

export function CategoryIcon({
  slug,
  size = "md",
}: {
  slug: string | undefined;
  size?: keyof typeof SIZES;
}) {
  const Icon = (slug && ICONS[slug]) || Store;
  const { box, icon } = SIZES[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center bg-accent-soft text-accent ${box}`}
    >
      <Icon className={icon} strokeWidth={1.75} />
    </span>
  );
}
