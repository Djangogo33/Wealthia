**PROMPT EMERGENT — WEALTHIA · SESSION DE TRAVAIL**

---

**RÔLE**
Tu es mon développeur Full-Stack Senior, expert en cybersécurité mobile et UX/UI. Tu connais intégralement le projet **Wealthia** — application universelle de suivi de budget, patrimoine et investissements, destinée à tous les profils (grand public, épargnants actifs, investisseurs patrimoniaux). Tu ne codes rien sans ma validation explicite à chaque étape.

---

**RÈGLE ABSOLUE**
Wealthia manipule des données financières personnelles. La sécurité, la conformité RGPD et la stabilité sont **non négociables**. Les trois objectifs suivants ont le même poids et le plan d'action doit les servir simultanément : **publier une version stable**, **maximiser la valeur perçue dès le départ**, et **convertir les premiers utilisateurs vers un palier payant**. Aucun ne prime sur les autres.

---

**CONTRAINTES TRANSVERSALES** *(s'appliquent à toutes les phases sans exception)*

**Sécurité**
- Toutes les données sensibles stockées dans le secure enclave (Keychain iOS / Keystore Android)
- HTTPS enforced, certificate pinning, aucun log de données financières
- Confirmation biométrique ou mot de passe pour toute action sensible (export, suppression, etc.)
- Snapshots d'écran désactivés sur toutes les vues sensibles

**Conformité RGPD**
- Droit à l'effacement complet du compte et de toutes les données associées
- Portabilité des données (couvert par le module export)
- Consentement explicite et tracé pour chaque type de collecte (analytics, Open Banking, notifications)
- Durée de conservation des données définie et documentée
- Politique de confidentialité conforme et accessible depuis l'app — obligatoire pour la validation stores

**Qualité & fiabilité**
- Stratégie de tests définie dès le départ : tests unitaires sur la logique financière (calculs critiques), tests d'intégration sur les flux d'auth et d'export, tests e2e sur les parcours principaux
- Monitoring en production dès la Phase 1 : outil de suivi d'erreurs (ex : Sentry) et logs serveur anonymisés
- Gestion explicite des états d'erreur dans l'UI (réseau, sync, auth échouée)

**Conformité stores financières**
- Apple App Store et Google Play ont des exigences spécifiques pour les apps financières : déclaration précise des données collectées, justification des permissions sensibles (biométrie, notifications, accès réseau), review manuelle possible. Ces contraintes doivent être intégrées dès l'architecture, pas en fin de projet.

---

**ÉTAPE 1 — AUDIT & PLAN D'ACTION** *(attends ma validation avant tout code)*

**1. État de l'architecture actuelle**
- Framework et version exacts, structure des dossiers, dépendances clés
- Dette technique, fragilités et points bloquants identifiés

**2. Audit de sécurité**
- Stockage des tokens/clés API : Keychain/Keystore ou autre ?
- Gestion des sessions et états d'arrière-plan
- Surface d'attaque réseau (HTTPS enforced, certificate pinning ?)
- Fuites potentielles (logs, cache, snapshots)
- Authentification actuelle : lacunes et vecteurs d'attaque

**3. Recommandation d'architecture cible — Mobile + Web + Stack**

Point le plus structurant de cet audit. Je veux une **recommandation claire et assumée** sur les trois questions suivantes :

*3a. Codebase unifié ou séparé ?*
Évalue si **Expo SDK 50+ avec React Native Web** est la meilleure option pour couvrir iOS + Android + Web desktop en un seul codebase, ou si une autre approche est plus adaptée à l'état actuel du projet. Recommandation tranchée avec compromis honnêtes.

*3b. Migration nécessaire ?*
Si l'architecture actuelle ne supporte pas la biométrie native, les widgets, le mode hors ligne ou la publication stores : plan de migration précis (fichiers concernés, risques, durée estimée).

*3c. Stack back-end & base de données selon le scénario de déploiement*
Compare les deux options et recommande la plus adaptée à Wealthia (données financières, multi-utilisateurs, sync offline, temps réel) :
- **Scénario A — Hébergement Emergent** : services gérés nativement, contraintes, coût estimé à l'échelle
- **Scénario B — Déploiement autonome** : stack recommandée (ex : Supabase, Railway, Fly.io…), base de données (PostgreSQL ou autre), coût estimé

> Tu recommandes, je valide. "Ça dépend" sans recommandation assumée n'est pas une réponse acceptable.

**4. Guide de publication — Play Store, App Store & Web**
Guide pas à pas adapté à l'architecture recommandée, en deux scénarios :

- **Scénario A — Avec support Emergent** : ce que vous gérez, ce que je dois fournir (comptes, assets, signatures)
- **Scénario B — En autonomie totale** :
  - Création des comptes Google Play Console et Apple Developer
  - Génération du keystore / certificat de signature
  - Build de production (commandes exactes selon le framework retenu)
  - Configuration des fichiers concernés (`app.json`, `build.gradle`, `Info.plist`, etc.)
  - Checklist de conformité stores (politique de confidentialité, permissions, données collectées, screenshots)
  - Déploiement de la version web (hébergement, domaine, CI/CD)
  - Délais de review estimés et points de blocage fréquents pour les apps financières

---

**CAHIER DES CHARGES — ORDONNÉ PAR PHASE DE LIVRAISON**

*(Toutes les fonctionnalités sont à planifier et à implémenter — l'ordre reflète uniquement la séquence de développement recommandée)*

---

**PHASE 1 — MVP PUBLIABLE & MONÉTISABLE**
*(objectif : version store stable, sécurisée, avec conversion freemium active dès le lancement)*

**A. Sécurité & stabilité** *(critique)*
- Correction de tous les bugs identifiés dans l'audit
- Biométrie native au démarrage et après inactivité configurable (Face ID / Touch ID / BiometricPrompt)
- Verrouillage automatique au passage en arrière-plan
- Stockage chiffré de tous les tokens et clés dans le secure enclave
- Message de réassurance UX : l'utilisateur doit comprendre que **seul lui** a accès à ses données

**B. Authentification & Freemium**
- Auth complète : mot de passe, Google OAuth, Magic Link (email sans mot de passe)
- 3 paliers : **Gratuit / Pro / Max** avec gates de fonctionnalités clairement définis dès le départ
- Codes promo : déblocage Pro ou Max avec durée personnalisable (1 mois / 1 an / à vie)
- Répartition freemium suggérée à valider :
  - **Gratuit** : fonctionnalités de base, export CSV, 1 compte bancaire manuel
  - **Pro** : export PDF/XLSX, Open Banking, notifications push, multi-devises, widget, budgets partagés jusqu'à 2 personnes
  - **Max** : IA patrimoniale, immobilier, emprunts, webhooks, WhatsApp, budgets partagés jusqu'à 6 personnes

**C. Corrections UX & identité visuelle**
- Réparation du graphique interactif cassé
- Intégration du logo et favicon fournis
- Nouveaux graphiques financiers : comparatifs mensuels/annuels, répartition des actifs, évolution nette

**D. Export & portabilité** *(différenciateur Pro visible dès le lancement)*
- **CSV** : transactions brutes — disponible en Gratuit
- **PDF** : rapport financier mis en page avec filigrane discret (nom + date) — Pro/Max
- **Excel (XLSX)** : onglets séparés (transactions, budgets, patrimoine, emprunts) — Pro/Max
- **JSON** : backup complet et interopérabilité — Pro/Max
- Génération 100% locale ou via API sécurisée — aucun transit tiers
- Fichiers non mis en cache au-delà du partage immédiat

---

**PHASE 2 — ENRICHISSEMENT**
*(post-lancement : fidélisation, croissance et montée en valeur)*

**E. Import & synchronisation bancaire**
- Import manuel : CSV, OFX, QIF (onboarding historique bancaire existant)
- Open Banking / PSD2 via agrégateur certifié (Powens, Nordigen ou Budget Insight) — implications RGPD et certifications à détailler

**F. Notifications push intelligentes**
- Budget dépassé ou sur le point de l'être
- Objectif d'épargne atteint
- Échéance de prêt ou paiement récurrent à venir
- Variation importante d'un actif suivi
- Récapitulatif hebdomadaire/mensuel optionnel
- ⚠️ Aucune donnée financière précise visible sur l'écran verrouillé ("Alerte budget", pas "847€ dépensés")

**G. Multi-devises**
- Plusieurs devises par compte/actif
- Taux de change en temps réel (Open Exchange Rates, Fixer.io ou équivalent)
- Devise de référence choisie par l'utilisateur pour les totaux consolidés
- Conservation des taux historiques pour les exports passés (pas de recalcul au taux actuel)
- Devise d'origine toujours visible à côté du montant converti

**H. Widget écran d'accueil**
- iOS (WidgetKit) et Android natif : solde global, budget restant, ou dernier mouvement
- Tailles petit et moyen supportées
- Données chiffrées au repos — montants masqués si appareil verrouillé
- Option indicateurs visuels uniquement (jauge de budget, sans montants)

**I. Mode hors ligne**
- Accès en lecture complète sans connexion
- Saisie de transactions offline avec file d'attente de synchronisation
- Indicateur visuel de l'état de sync (à jour / en attente / conflit)
- Gestion des conflits multi-appareils

**J. Budgets partagés**
- Partage de budgets entre plusieurs personnes — fonctionnalité payante : Pro jusqu'à 2 personnes, Max jusqu'à 6 personnes (extensible via config admin)
- Rôles et permissions par budget partagé : **Propriétaire**, **Collaborateur (édition)**, **Collaborateur (lecture seule)**
- Actions sensibles (modification de règles budgétaires, suppression de transactions partagées) soumises à confirmation biométrique ou mot de passe
- Mode hors ligne supporté avec file d'attente de sync et résolution de conflits multi-appareils (indicateur visuel + option de résolution manuelle)
- Aucune donnée financière sensible exposée sur l'écran verrouillé ou dans les notifications push

**K. Système de parrainage**
- Chaque utilisateur peut générer un lien ou un code de parrainage unique et traçable
- Récompense déclenchée lorsque le filleul atteint un critère configurable (activation, premier export, ou premier abonnement payant)
- Récompenses paramétrables via l'admin : période d'essai prolongée, remise sur abonnement, crédit interne, ou mois gratuit — cumulables ou non selon configuration
- Anti-abus : limites par IP, vérification d'email, détection d'inscriptions massives, révocation admin possible
- Reporting dans le back-office : parrainages actifs, conversions, valeur LTV estimée des filleuls

---

**PHASE 3 — FONCTIONNALITÉS AVANCÉES**
*(différenciateurs Max, montée en valeur long terme)*

**L. Fonctionnalités IA & métier**
- Prévision patrimoniale IA : projection 5 / 10 ans basée sur l'historique
- Gestion immobilière : biens en location, revenus, charges, rentabilité, assistance IA
- Gestion des emprunts : échéancier, capital restant dû, coût total
- Webhooks configurables : alertes budget / variation d'actifs → Discord, Slack, etc.
- Intégration WhatsApp via Wingman : ajout de transactions par message, onboarding guidé et simplifié

**M. Back-office Admin**
- Console privée réservée à l'équipe produit — accès restreint, authentification renforcée, jamais exposée aux utilisateurs finaux
- Gestion utilisateurs : liste, plan de souscription actuel, statut d'activité, actions (modification de palier, suspension)
- Codes promo : création, modification et révocation (palier déverrouillé, durée, usage unique ou multiple, quota d'utilisation)
- Reporting parrainage : parrainages actifs, conversions, LTV estimée des filleuls
- **Traçabilité complète** : toutes les actions admin (création de code promo, modification de palier, changement de statut) journalisées avec horodatage et auteur pour conformité et audit

---

**CE QUE J'ATTENDS EN RÉPONSE À CE MESSAGE**

1. **Confirmation de compréhension** du cahier des charges complet, des trois phases et de toutes les features (A → M)
2. **Audit de sécurité** détaillé (point 2)
3. **Recommandation d'architecture** Mobile + Web, assumée et justifiée (point 3)
4. **Recommandation de stack back-end / BDD** avec coûts estimés par scénario (point 3c)
5. **Guide de publication** complet adapté à l'architecture recommandée (point 4)
6. **Plan d'action Phase 1** détaillé (A, B, C, D) — prêt à valider avant tout code
7. **Positionnement des features Phase 2 et 3** dans la roadmap : ordre recommandé, dépendances techniques entre les blocs, et estimation de charge globale

⚠️ Tu n'écris aucune ligne de code tant que je n'ai pas validé le plan.

---
