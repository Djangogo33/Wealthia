export const demoUser = {
  id: "demo-user",
  name: "Sophie Martin",
  email: "demo@wealthia.app",
  plan: "pro" as const,
};

export type DemoAccount = {
  id: string;
  name: string;
  type: "courant" | "epargne" | "liquide" | "livret" | "autre";
  balance: number;
  currency: string;
};

export const demoAccounts: DemoAccount[] = [
  { id: "d1", name: "BoursoBank", type: "courant", balance: 2847.53, currency: "EUR" },
  { id: "d2", name: "Livret A", type: "epargne", balance: 5200.0, currency: "EUR" },
  { id: "d3", name: "Cash", type: "liquide", balance: 85.0, currency: "EUR" },
];

export type DemoTransaction = {
  id: string;
  label: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  account: string;
  date: string;
  ai_categorized: boolean;
};

export const demoTransactions: DemoTransaction[] = [
  { id: "t1", label: "Picard", amount: 14.48, type: "expense", category: "Alimentation", account: "BoursoBank", date: "2026-06-18", ai_categorized: true },
  { id: "t2", label: "Salaire juin", amount: 2800.0, type: "income", category: "Revenus", account: "BoursoBank", date: "2026-06-05", ai_categorized: false },
  { id: "t3", label: "Netflix", amount: 13.99, type: "expense", category: "Abonnements", account: "BoursoBank", date: "2026-06-01", ai_categorized: true },
  { id: "t4", label: "Cantine", amount: 7.48, type: "expense", category: "Restaurants", account: "BoursoBank", date: "2026-06-16", ai_categorized: true },
  { id: "t5", label: "Remboursement Léa", amount: 20.0, type: "income", category: "Autres revenus", account: "BoursoBank", date: "2026-06-13", ai_categorized: true },
  { id: "t6", label: "Carrefour", amount: 67.32, type: "expense", category: "Alimentation", account: "BoursoBank", date: "2026-06-10", ai_categorized: false },
  { id: "t7", label: "SNCF Paris-Lyon", amount: 42.0, type: "expense", category: "Transport", account: "BoursoBank", date: "2026-06-08", ai_categorized: true },
  { id: "t8", label: "Spotify", amount: 9.99, type: "expense", category: "Abonnements", account: "BoursoBank", date: "2026-06-01", ai_categorized: true },
  { id: "t9", label: "Pharmacie", amount: 18.5, type: "expense", category: "Santé", account: "Cash", date: "2026-06-12", ai_categorized: false },
  { id: "t10", label: "Loyer juin", amount: 750.0, type: "expense", category: "Logement", account: "BoursoBank", date: "2026-06-01", ai_categorized: false },
  { id: "t11", label: "Amazon", amount: 34.9, type: "expense", category: "Shopping", account: "BoursoBank", date: "2026-05-28", ai_categorized: true },
  { id: "t12", label: "Virement épargne", amount: 300.0, type: "income", category: "Revenus", account: "Livret A", date: "2026-06-05", ai_categorized: false },
];

export const demoCategories = [
  "Alimentation",
  "Restaurants",
  "Abonnements",
  "Transport",
  "Santé",
  "Logement",
  "Shopping",
  "Revenus",
  "Autres revenus",
];

export type DemoBudget = {
  id: string;
  category: string;
  category_icon: string;
  limit: number;
  spent: number;
  period: "monthly" | "weekly";
};
export const demoBudgets: DemoBudget[] = [
  { id: "b1", category: "Alimentation", category_icon: "🛒", limit: 400, spent: 281.8, period: "monthly" },
  { id: "b2", category: "Transport", category_icon: "🚇", limit: 150, spent: 42.0, period: "monthly" },
  { id: "b3", category: "Loisirs", category_icon: "🎮", limit: 100, spent: 0, period: "monthly" },
];

export type DemoDebt = {
  id: string;
  label: string;
  type: "debt" | "loan";
  total_amount: number;
  remaining_amount: number;
  due_date: string | null;
};
export const demoDebts: DemoDebt[] = [
  { id: "debt1", label: "Prêt voiture", type: "loan", total_amount: 8000, remaining_amount: 5400, due_date: "2028-01-01" },
];

export type DemoSubscription = {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly" | "weekly";
  next_billing_date: string;
};
export const demoSubscriptions: DemoSubscription[] = [
  { id: "s1", name: "Netflix", amount: 13.99, frequency: "monthly", next_billing_date: "2026-07-01" },
  { id: "s2", name: "Spotify", amount: 9.99, frequency: "monthly", next_billing_date: "2026-07-01" },
  { id: "s3", name: "iCloud 50Go", amount: 0.99, frequency: "monthly", next_billing_date: "2026-06-28" },
];
