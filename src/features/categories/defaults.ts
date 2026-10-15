import type { CategoryKind } from "@/lib/domain-constants";

/** BR-CAT-006: categories created for every new ledger, in the user's language. */

export type DefaultCategory = {
  name: { tr: string; en: string };
  icon: string;
  color: string;
  children?: DefaultCategory[];
};

export const DEFAULT_CATEGORIES: Record<CategoryKind, DefaultCategory[]> = {
  expense: [
    { name: { tr: "Market", en: "Groceries" }, icon: "shopping-cart", color: "green" },
    { name: { tr: "Yemek ve Kafe", en: "Food and Coffee" }, icon: "utensils", color: "orange" },
    {
      name: { tr: "Ulaşım", en: "Transport" },
      icon: "car",
      color: "blue",
      children: [
        { name: { tr: "Yakıt", en: "Fuel" }, icon: "fuel", color: "blue" },
        { name: { tr: "Toplu taşıma", en: "Public transport" }, icon: "bus", color: "blue" },
        { name: { tr: "Taksi", en: "Taxi" }, icon: "car-taxi-front", color: "blue" },
      ],
    },
    {
      name: { tr: "Faturalar", en: "Bills" },
      icon: "receipt",
      color: "amber",
      children: [
        { name: { tr: "Elektrik", en: "Electricity" }, icon: "zap", color: "amber" },
        { name: { tr: "Su", en: "Water" }, icon: "droplet", color: "amber" },
        { name: { tr: "Doğalgaz", en: "Gas" }, icon: "flame", color: "amber" },
        { name: { tr: "İnternet", en: "Internet" }, icon: "wifi", color: "amber" },
        { name: { tr: "Telefon", en: "Phone" }, icon: "smartphone", color: "amber" },
      ],
    },
    { name: { tr: "Kira", en: "Rent" }, icon: "house", color: "indigo" },
    { name: { tr: "Ev", en: "Home" }, icon: "sofa", color: "teal" },
    { name: { tr: "Sağlık", en: "Health" }, icon: "heart-pulse", color: "red" },
    { name: { tr: "Eğitim", en: "Education" }, icon: "graduation-cap", color: "violet" },
    { name: { tr: "Giyim", en: "Clothing" }, icon: "shirt", color: "pink" },
    { name: { tr: "Eğlence", en: "Entertainment" }, icon: "ticket", color: "cyan" },
    { name: { tr: "Abonelikler", en: "Subscriptions" }, icon: "repeat", color: "violet" },
    { name: { tr: "Kişisel bakım", en: "Personal care" }, icon: "sparkles", color: "pink" },
    { name: { tr: "Hediye", en: "Gifts" }, icon: "gift", color: "red" },
    { name: { tr: "Diğer", en: "Other" }, icon: "circle-dot", color: "slate" },
  ],
  income: [
    { name: { tr: "Maaş", en: "Salary" }, icon: "briefcase", color: "green" },
    { name: { tr: "Ek gelir", en: "Side income" }, icon: "circle-plus", color: "teal" },
    { name: { tr: "Faiz ve getiri", en: "Interest and returns" }, icon: "trending-up", color: "cyan" },
    { name: { tr: "Hediye", en: "Gifts" }, icon: "gift", color: "pink" },
    { name: { tr: "Diğer", en: "Other" }, icon: "circle-dot", color: "slate" },
  ],
};

export const DEFAULT_CASH_ACCOUNT = { tr: "Nakit", en: "Cash" } as const;
export const DEFAULT_LEDGER_NAME = { tr: "Kişisel", en: "Personal" } as const;
