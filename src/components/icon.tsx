import {
  Briefcase,
  Bus,
  Car,
  CarTaxiFront,
  CircleDot,
  CirclePlus,
  CreditCard,
  Droplet,
  Flame,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

/**
 * Icons that categories and accounts may use. A fixed registry keeps the bundle small
 * and the stored names stable (ui standard §3.7).
 */
export const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  bus: Bus,
  car: Car,
  "car-taxi-front": CarTaxiFront,
  "circle-dot": CircleDot,
  "circle-plus": CirclePlus,
  "credit-card": CreditCard,
  droplet: Droplet,
  flame: Flame,
  fuel: Fuel,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  house: House,
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  receipt: Receipt,
  repeat: Repeat,
  shirt: Shirt,
  "shopping-cart": ShoppingCart,
  smartphone: Smartphone,
  sofa: Sofa,
  sparkles: Sparkles,
  tag: Tag,
  ticket: Ticket,
  "trending-up": TrendingUp,
  utensils: Utensils,
  wallet: Wallet,
  wifi: Wifi,
  zap: Zap,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name] ?? Tag;
  return <Component aria-hidden className={className} />;
}
