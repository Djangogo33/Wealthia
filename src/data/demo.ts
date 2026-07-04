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
  { id: "b1", category: "Alimentation", category_icon: "utensils", limit: 400, spent: 281.8, period: "monthly" },
  { id: "b2", category: "Transport", category_icon: "car", limit: 150, spent: 42.0, period: "monthly" },
  { id: "b3", category: "Loisirs", category_icon: "gamepad-2", limit: 100, spent: 0, period: "monthly" },
];

export type DemoAsset = {
  id: string;
  type: "Action" | "ETF" | "Crypto" | "Autre";
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  currency: string;
};

export const demoAssets: DemoAsset[] = [
  { id: "a1", type: "ETF",    symbol: "IWDA", name: "iShares MSCI World", quantity: 15,   purchase_price: 85.2,   current_price: 98.4,  currency: "EUR" },
  { id: "a2", type: "Action", symbol: "AAPL", name: "Apple Inc.",         quantity: 5,    purchase_price: 142.0,  current_price: 189.5, currency: "USD" },
  { id: "a3", type: "Crypto", symbol: "BTC",  name: "Bitcoin",            quantity: 0.05, purchase_price: 28000,  current_price: 62000, currency: "EUR" },
  { id: "a4", type: "Action", symbol: "AIR",  name: "Airbus SE",          quantity: 8,    purchase_price: 120.0,  current_price: 165.3, currency: "EUR" },
];

export type DemoGoal = {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

export const demoGoals: DemoGoal[] = [
  { id: "g1", name: "Apport immobilier", icon: "🏠", target_amount: 30000, current_amount: 12400, target_date: "2027-06-01" },
  { id: "g2", name: "Voyage Japon",      icon: "✈️", target_amount: 3500,  current_amount: 1850,  target_date: "2026-12-01" },
  { id: "g3", name: "Fonds d'urgence",   icon: "💰", target_amount: 5000,  current_amount: 5000,  target_date: null },
];

export type DemoDebt = {
  id: string;
  label: string;
  type: "debt" | "loan";
  total_amount: number;
  remaining_amount: number;
  due_date: string | null;
  account_id: string | null;
  settled_at: string | null;
};
export const demoDebts: DemoDebt[] = [
  { id: "debt1", label: "Prêt voiture", type: "loan", total_amount: 8000, remaining_amount: 5400, due_date: "2028-01-01", account_id: "d1", settled_at: null },
];

export type DemoSubscription = {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly" | "weekly";
  next_billing_date: string;
  account_id: string | null;
  paused: boolean;
};
export const demoSubscriptions: DemoSubscription[] = [
  { id: "s1", name: "Netflix",     amount: 13.99, frequency: "monthly", next_billing_date: "2026-07-01", account_id: "d1", paused: false },
  { id: "s2", name: "Spotify",     amount: 9.99,  frequency: "monthly", next_billing_date: "2026-07-01", account_id: "d1", paused: false },
  { id: "s3", name: "iCloud 50Go", amount: 0.99,  frequency: "monthly", next_billing_date: "2026-06-28", account_id: "d1", paused: false },
];

export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};
export const demoNotifications: DemoNotification[] = [
  { id: "n1", title: "Prélèvement Netflix", body: "Prélèvement Netflix de 13,99€ aujourd'hui sur BoursoBank", read: false, created_at: "2026-06-22T08:00:00Z" },
  { id: "n2", title: "Rappel Spotify",      body: "Spotify de 9,99€ prélevé dans 3 jours",                       read: true,  created_at: "2026-06-20T08:00:00Z" },
];

export const demoReplies = {
  default: "🔒 Mode démo — créez un compte pour des conseils personnalisés !",
  sante: `📊 Bilan démo :
• 💰 Épargne : **70,4%** → excellent !
• 🛒 Top dépense : Alimentation **281 €**
• 📈 Portefeuille : **54 320 €** (+4,1%)

👉 Continuez ce rythme, vous êtes en très bonne voie ! ✅`,
  depenses: `💸 Vos abonnements :
• 📺 Netflix + Spotify + iCloud = **24,97 €/mois**
• ✂️ Économie possible si vous supprimez 1 abonnement : **~10 €/mois**

👉 Revoyez vos abonnements chaque trimestre ! 🔄`,
  objectifs: `🎯 Vos objectifs :
• ✈️ Voyage Japon : **52%** (1 850 € / 3 500 €) → dans ~5 mois
• 🏠 Apport immo : **41%** (12 400 € / 30 000 €) → dans ~2 ans

👉 Augmentez l'épargne mensuelle de **50 €** pour gagner 2 mois ! 💪`,
};
