export type Language = "fr" | "en";

const translations = {
  fr: {
    app: { name: "Wealthia", tagline: "Gestion de Patrimoine" },
    demo: {
      banner: "Mode Démo — vos données ne sont pas sauvegardées",
      cta: "S'inscrire gratuitement →",
      button: "✦ Essayer la démo gratuitement",
      writeBlocked: "Action désactivée en mode démo",
    },
    nav: {
      home: "Accueil",
      transactions: "Transactions",
      accounts: "Comptes",
      stocks: "Bourse",
      advisor: "Conseiller",
    },
    home: {
      hello: "Bonjour,",
      overview: "Aperçu de vos finances",
      totalBalance: "Solde Total",
      income: "Revenus",
      expenses: "Dépenses",
      myAccounts: "Mes Comptes",
      monthExpenses: "Dépenses du Mois",
      seeAll: "Voir tout",
      percentOfTotal: "% du total",
    },
    auth: {
      google: "Continuer avec Google",
      or: "ou",
      email: "Adresse email",
      password: "Mot de passe",
      name: "Nom",
      login: "Se connecter",
      signup: "S'inscrire",
      magicLink: "Connexion par lien magique",
      magicSent: "Lien magique envoyé ! Vérifiez votre boîte mail.",
      noAccount: "Pas encore de compte ?",
      haveAccount: "Déjà un compte ?",
    },
    transactions: {
      title: "Transactions",
      empty: "Aucune transaction",
      emptyHint: "Ajoutez votre première dépense avec le bouton +",
      loadMore: "Charger plus",
      aiBadge: "IA",
      add: {
        titleExpense: "Nouvelle dépense",
        titleIncome: "Nouveau revenu",
        amount: "Montant",
        label: "Libellé",
        labelPlaceholder: "Ex. Courses Carrefour",
        category: "Catégorie",
        account: "Compte",
        noAccount: "Aucun compte",
        date: "Date",
        notes: "Notes",
        addNote: "Ajouter une note",
        submit: "Enregistrer",
      },
      delete: {
        confirm: "Supprimer cette transaction ?",
        confirmCta: "Supprimer",
        cancel: "Annuler",
      },
    },
    stub: {
      soon: "Bientôt disponible",
      soonDesc: "Cette section est en cours de construction.",
    },
    paywall: {
      title: "Fonctionnalité Premium",
      subtitle: "Passez à un plan supérieur pour accéder à cette fonctionnalité",
      monthly: "/ mois",
      yearly: "/ an",
      upgrade: "Mettre à niveau",
      later: "Plus tard",
    },
  },
  en: {
    app: { name: "Wealthia", tagline: "Wealth Management" },
    demo: {
      banner: "Demo Mode — your data is not saved",
      cta: "Sign up for free →",
      button: "✦ Try the demo",
      writeBlocked: "Action disabled in demo mode",
    },
    nav: {
      home: "Home",
      transactions: "Transactions",
      accounts: "Accounts",
      stocks: "Stocks",
      advisor: "Advisor",
    },
    home: {
      hello: "Hello,",
      overview: "Your financial overview",
      totalBalance: "Total Balance",
      income: "Income",
      expenses: "Expenses",
      myAccounts: "My Accounts",
      monthExpenses: "Monthly Expenses",
      seeAll: "See all",
      percentOfTotal: "% of total",
    },
    auth: {
      google: "Continue with Google",
      or: "or",
      email: "Email address",
      password: "Password",
      name: "Name",
      login: "Sign in",
      signup: "Sign up",
      magicLink: "Sign in with magic link",
      magicSent: "Magic link sent! Check your inbox.",
      noAccount: "No account yet?",
      haveAccount: "Already have an account?",
    },
    transactions: {
      title: "Transactions",
      empty: "No transactions",
      emptyHint: "Add your first expense with the + button",
      loadMore: "Load more",
      aiBadge: "AI",
      add: {
        titleExpense: "New expense",
        titleIncome: "New income",
        amount: "Amount",
        label: "Label",
        labelPlaceholder: "E.g. Carrefour groceries",
        category: "Category",
        account: "Account",
        noAccount: "No account",
        date: "Date",
        notes: "Notes",
        addNote: "Add a note",
        submit: "Save",
      },
      delete: {
        confirm: "Delete this transaction?",
        confirmCta: "Delete",
        cancel: "Cancel",
      },
    },
    stub: {
      soon: "Coming soon",
      soonDesc: "This section is under construction.",
    },
    paywall: {
      title: "Premium Feature",
      subtitle: "Upgrade your plan to access this feature",
      monthly: "/ month",
      yearly: "/ year",
      upgrade: "Upgrade",
      later: "Later",
    },
  },
} as const;

export type Strings = typeof translations.fr;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

function readLang(): Language {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem("wealthia_lang");
  return stored === "en" ? "en" : "fr";
}

export function useTranslation() {
  const lang: Language = readLang();
  const strings = translations[lang];

  const t = (key: string): string =>
    getNestedValue(strings as unknown as Record<string, unknown>, key);

  const setLanguage = (l: Language) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("wealthia_lang", l);
    window.location.reload();
  };

  return { t, strings, lang, setLanguage };
}
