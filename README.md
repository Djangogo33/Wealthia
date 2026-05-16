# PROMPT EMERGENT — WEALTHIA · SESSION DE TRAVAIL

---

## RÔLE

Tu es mon développeur Full-Stack Senior, expert en cybersécurité mobile et UX/UI. Tu connais intégralement le projet **Wealthia** — application universelle de suivi de budget, patrimoine et investissements, destinée à tous les profils (grand public, épargnants actifs, investisseurs patrimoniaux). Tu ne codes rien sans ma validation explicite à chaque étape.

---

## RÈGLE ABSOLUE

Wealthia manipule des données financières personnelles. La sécurité, la conformité RGPD et la stabilité sont **non négociables**. Les trois objectifs suivants ont le même poids et le plan d'action doit les servir simultanément : **publier une version stable**, **maximiser la valeur perçue dès le départ**, et **convertir les premiers utilisateurs vers un palier payant**. Aucun ne prime sur les autres.

---

## CONTRAINTES TRANSVERSALES

*(s'appliquent à toutes les phases sans exception)*

### Sécurité

- Toutes les données sensibles stockées dans le secure enclave (Keychain iOS / Keystore Android)
- HTTPS enforced, certificate pinning, aucun log de données financières
- Confirmation biométrique ou mot de passe pour toute action sensible (export, suppression, etc.)
- Snapshots d'écran désactivés sur toutes les vues sensibles

### Conformité RGPD

- Droit à l'effacement complet du compte et de toutes les données associées
- Portabilité des données (couvert par le module export)
- Consentement explicite et tracé pour chaque type de collecte (analytics, Open Banking, notifications)
- Durée de conservation des données définie et documentée
- Politique de confidentialité conforme et accessible depuis l'app — obligatoire pour la validation stores

### Qualité & fiabilité

- Stratégie de tests définie dès le départ : tests unitaires sur la logique financière (calculs critiques), tests d'intégration sur les flux d'auth et d'export, tests e2e sur les parcours principaux
- Monitoring en production dès la Phase 1 : outil de suivi d'erreurs (ex : Sentry) et logs serveur anonymisés
- Gestion explicite des états d'erreur dans l'UI (réseau, sync, auth échouée)

### Conformité stores financières

Apple App Store et Google Play ont des exigences spécifiques pour les apps financières : déclaration précise des données collectées, justification des permissions sensibles (biométrie, notifications, accès réseau), review manuelle possible. Ces contraintes doivent être intégrées dès l'architecture, pas en fin de projet.

---

## ÉTAPE 1 — AUDIT & PLAN D'ACTION

*(Attends ma validation avant tout code)*

### 1. État de l'architecture actuelle

- Framework et version exacts, structure des dossiers, dépendances clés
- Dette technique, fragilités et points bloquants identifiés

### 2. Audit de sécurité

- Stockage des tokens/clés API : Keychain/Keystore ou autre ?
- Gestion des sessions et états d'arrière-plan
- Surface d'attaque réseau (HTTPS enforced, certificate pinning ?)
- Fuites potentielles (logs, cache, snapshots)
- Authentification actuelle : lacunes et vecteurs d'attaque

### 3. Recommandation d'architecture cible — Mobile + Web + Stack

Point le plus structurant de cet audit. Je veux une **recommandation claire et assumée** sur les trois questions suivantes :

**3a. Codebase unifié ou séparé ?**
Évalue si **Expo SDK 50+ avec React Native Web** est la meilleure option pour couvrir iOS + Android + Web desktop en un seul codebase, ou si une autre approche est plus adaptée à l'état actuel du projet. Recommandation tranchée avec compromis honnêtes.

**3b. Migration nécessaire ?**
Si l'architecture actuelle ne supporte pas la biométrie native, les widgets, le mode hors ligne ou la publication stores : plan de migration précis (fichiers concernés, risques, durée estimée).

**3c. Stack back-end & base de données selon le scénario de déploiement**
Compare les deux options et recommande la plus adaptée à Wealthia (données financières, multi-utilisateurs, sync offline, temps réel) :

- **Scénario A — Hébergement Emergent** : services gérés nativement, contraintes, coût estimé à l'échelle
- **Scénario B — Déploiement autonome** : stack recommandée (ex : Supabase, Railway, Fly.io…), base de données (PostgreSQL ou autre), coût estimé

> Tu recommandes, je valide. "Ça dépend" sans recommandation assumée n'est pas une réponse acceptable.

### 4. Guide de publication — Play Store, App Store & Web

Guide pas à pas adapté à l'architecture recommandée, en deux scénarios :

**Scénario A — Avec support Emergent**
Ce que vous gérez, ce que je dois fournir (comptes, assets, signatures).

**Scénario B — En autonomie totale**

- Création des comptes Google Play Console et Apple Developer
- Génération du keystore / certificat de signature
- Build de production (commandes exactes selon le framework retenu)
- Configuration des fichiers concernés (`app.json`, `build.gradle`, `Info.plist`, etc.)
- Checklist de conformité stores (politique de confidentialité, permissions, données collectées, screenshots)
- Déploiement de la version web (hébergement, domaine, CI/CD)
- Délais de review estimés et points de blocage fréquents pour les apps financières

---

## CAHIER DES CHARGES — ORDONNÉ PAR PRIORITÉ D'IMPLÉMENTATION

*(Toutes les fonctionnalités sont à planifier et à implémenter — l'ordre reflète la séquence logique de développement : chaque bloc débloque ou renforce le suivant)*

---

## PHASE 1 — MVP PUBLIABLE & MONÉTISABLE

*(Objectif : version store stable, sécurisée, avec conversion freemium active dès le lancement)*

> **Logique de priorité** : on pose d'abord les fondations de sécurité et d'identité (A, C), puis le système d'auth et de monétisation (B), puis les outils qui rendent la valeur Pro immédiatement visible (D), et enfin le back-office sans lequel on ne peut pas gérer les utilisateurs ni les codes promo dès le lancement (E).

### A. Sécurité & stabilité *(priorité absolue — bloque tout le reste)*

- Correction de tous les bugs identifiés dans l'audit
- Biométrie native au démarrage et après inactivité configurable (Face ID / Touch ID / BiometricPrompt)
- Verrouillage automatique au passage en arrière-plan
- Stockage chiffré de tous les tokens et clés dans le secure enclave
- Message de réassurance UX : l'utilisateur doit comprendre que **seul lui** a accès à ses données

### B. Corrections UX & identité visuelle *(avant l'auth — l'app doit être présentable)*

- Réparation du graphique interactif cassé
- Intégration du logo et favicon fournis
- Nouveaux graphiques financiers : comparatifs mensuels/annuels, répartition des actifs, évolution nette

### C. Authentification & Freemium *(monétisation active dès le jour 1)*

- Auth complète : mot de passe, Google OAuth, Magic Link (email sans mot de passe)
- 3 paliers : **Gratuit / Pro / Max** avec gates de fonctionnalités clairement définis dès le départ
- Codes promo : déblocage Pro ou Max avec durée personnalisable (1 mois / 1 an / à vie)

**Répartition freemium suggérée à valider :**

| Fonctionnalité | Gratuit | Pro | Max |
|---|:---:|:---:|:---:|
| Fonctionnalités de base | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ✅ | ✅ |
| Score de santé financière (global) | ✅ | ✅ | ✅ |
| 1 compte bancaire manuel | ✅ | ✅ | ✅ |
| Export PDF / XLSX | ❌ | ✅ | ✅ |
| Open Banking | ❌ | ✅ | ✅ |
| Notifications push | ❌ | ✅ | ✅ |
| Multi-devises | ❌ | ✅ | ✅ |
| Widget écran d'accueil | ❌ | ✅ | ✅ |
| Budgets partagés (jusqu'à 2 personnes) | ❌ | ✅ | ✅ |
| Suivi des abonnements (complet) | ❌ | ✅ | ✅ |
| Coffre-fort numérique (500 Mo) | ❌ | ✅ | ✅ |
| Score de santé financière (détail + conseils) | ❌ | ✅ | ✅ |
| IA patrimoniale & prévisions | ❌ | ❌ | ✅ |
| Gestion immobilière | ❌ | ❌ | ✅ |
| Gestion des emprunts | ❌ | ❌ | ✅ |
| Webhooks & WhatsApp Wingman | ❌ | ❌ | ✅ |
| Budgets partagés (jusqu'à 6 personnes) | ❌ | ❌ | ✅ |
| Coffre-fort numérique (illimité) | ❌ | ❌ | ✅ |
| Intégration comptabilité | ❌ | ❌ | ✅ |

### D. Export & portabilité *(différenciateur Pro visible dès le lancement)*

- **CSV** : transactions brutes — disponible en Gratuit
- **PDF** : rapport financier mis en page avec filigrane discret (nom + date) — Pro/Max
- **Excel (XLSX)** : onglets séparés (transactions, budgets, patrimoine, emprunts) — Pro/Max
- **JSON** : backup complet et interopérabilité — Pro/Max
- Génération 100% locale ou via API sécurisée — aucun transit tiers
- Fichiers non mis en cache au-delà du partage immédiat

### E. Back-office Admin *(nécessaire dès le lancement pour gérer utilisateurs et codes promo)*

- Console privée réservée à l'équipe produit — accès restreint, authentification renforcée, jamais exposée aux utilisateurs finaux
- Gestion utilisateurs : liste, plan de souscription actuel, statut d'activité, actions (modification de palier, suspension)
- Codes promo : création, modification et révocation (palier déverrouillé, durée, usage unique ou multiple, quota d'utilisation)
- **Traçabilité complète** : toutes les actions admin journalisées avec horodatage et auteur pour conformité et audit

---

## PHASE 2 — ENRICHISSEMENT

*(Post-lancement : fidélisation, engagement et montée en valeur)*

> **Logique de priorité** : on commence par ce qui augmente la valeur perçue à l'ouverture (F, G), puis ce qui engage quotidiennement l'utilisateur (H, J), puis les features qui élargissent le périmètre de l'app (I, K, L), et enfin les mécaniques sociales et de croissance (M, N) qui nécessitent une base d'utilisateurs existante.

### F. Import & synchronisation bancaire *(débloque la valeur dès l'onboarding)*

- Import manuel : CSV, OFX, QIF (import de l'historique bancaire existant dès l'inscription)
- Open Banking / PSD2 via agrégateur certifié (Powens, Nordigen ou Budget Insight) — implications RGPD et certifications à détailler

### G. Notifications push intelligentes *(premier levier de rétention active)*

- Budget dépassé ou sur le point de l'être
- Objectif d'épargne atteint
- Échéance de prêt ou paiement récurrent à venir
- Variation importante d'un actif suivi
- Nouvel abonnement ou charge récurrente détecté
- Récapitulatif hebdomadaire/mensuel optionnel

> ⚠️ Aucune donnée financière précise visible sur l'écran verrouillé ("Alerte budget", pas "847€ dépensés")

### H. Score de santé financière *(engagement et récurrence d'ouverture)*

- Indicateur global calculé sur plusieurs dimensions : taux d'épargne mensuel, ratio dettes/revenus, respect du budget, diversification du patrimoine, régularité des revenus, progression nette sur 3/6/12 mois
- Score affiché sous forme visuelle gamifiée (ex : jauge, note /100, niveau)
- Détail du score par dimension avec conseils personnalisés pour progresser
- Historique du score pour visualiser l'évolution dans le temps
- Version basique (score global uniquement) en Gratuit — détail complet et conseils personnalisés en Pro/Max

### I. Suivi des abonnements & dépenses récurrentes *(tableau de bord à forte valeur perçue)*

- Détection automatique des abonnements et charges récurrentes (Netflix, Spotify, assurances, mutuelles, etc.) depuis l'historique de transactions
- Tableau de bord dédié : liste des abonnements actifs, coût mensuel/annuel consolidé, date de prochain prélèvement
- Alertes en cas de nouveau prélèvement récurrent détecté, de hausse de montant, ou d'abonnement inactif
- Possibilité de catégoriser, renommer et archiver manuellement chaque abonnement
- Version basique (liste uniquement, sans alertes) en Gratuit — complète en Pro/Max

### J. Multi-devises *(élargit le périmètre à tous les profils internationaux)*

- Plusieurs devises par compte/actif
- Taux de change en temps réel (Open Exchange Rates, Fixer.io ou équivalent)
- Devise de référence choisie par l'utilisateur pour les totaux consolidés
- Conservation des taux historiques pour les exports passés (pas de recalcul au taux actuel)
- Devise d'origine toujours visible à côté du montant converti

### K. Mode hors ligne *(qualité et fiabilité perçue de l'app)*

- Accès en lecture complète sans connexion
- Saisie de transactions offline avec file d'attente de synchronisation
- Indicateur visuel de l'état de sync (à jour / en attente / conflit)
- Gestion des conflits multi-appareils

### L. Widget écran d'accueil *(visibilité permanente, renforce l'habitude d'usage)*

- iOS (WidgetKit) et Android natif : solde global, budget restant, score de santé financière, ou dernier mouvement
- Tailles petit et moyen supportées
- Données chiffrées au repos — montants masqués si appareil verrouillé
- Option indicateurs visuels uniquement (jauge de budget, sans montants)

### M. Coffre-fort numérique *(différenciateur Pro/Max concret et rassurant)*

- Stockage sécurisé de documents financiers : contrats de prêt, avis d'imposition, relevés de compte, actes immobiliers, justificatifs d'assurance
- Chiffrement de bout en bout — aucun document accessible sans authentification biométrique ou mot de passe
- Accessible hors ligne (documents synchronisés sur l'appareil de manière chiffrée)
- Exportable en lot (ZIP chiffré) via le même flux sécurisé que le module export
- Stockage limité en Pro (ex : 500 Mo), illimité en Max

> ⚠️ Les documents ne doivent jamais apparaître dans les previews système (iOS/Android) ou les snapshots d'écran

### N. Budgets partagés *(feature sociale — nécessite une base d'utilisateurs active)*

- Partage de budgets entre plusieurs personnes — Pro jusqu'à 2 personnes, Max jusqu'à 6 personnes (extensible via config admin)
- Rôles et permissions : **Propriétaire**, **Collaborateur (édition)**, **Collaborateur (lecture seule)**
- Actions sensibles soumises à confirmation biométrique ou mot de passe
- Mode hors ligne supporté avec file d'attente de sync et résolution de conflits multi-appareils
- Aucune donnée financière sensible exposée sur l'écran verrouillé ou dans les notifications

### O. Système de parrainage *(croissance organique — à activer sur une base stable)*

- Chaque utilisateur peut générer un lien ou un code de parrainage unique et traçable
- Récompense déclenchée lorsque le filleul atteint un critère configurable (activation, premier export, ou premier abonnement payant)
- Récompenses paramétrables via l'admin : période d'essai prolongée, remise, crédit interne, ou mois gratuit — cumulables ou non
- Anti-abus : limites par IP, vérification d'email, détection d'inscriptions massives, révocation admin possible
- Reporting dans le back-office : parrainages actifs, conversions, valeur LTV estimée des filleuls

---

## PHASE 3 — FONCTIONNALITÉS AVANCÉES

*(Différenciateurs Max, montée en valeur long terme)*

> **Logique de priorité** : les fonctionnalités IA (P) sont le cœur de l'offre Max et le principal argument de vente premium — elles passent en premier. L'intégration comptabilité (Q) cible un segment pro à haute valeur et s'appuie sur les exports déjà en place. Le reporting parrainage (R) vient enrichir le back-office déjà livré en Phase 1.

### P. Fonctionnalités IA & métier *(cœur de l'offre Max — principal différenciateur premium)*

- Prévision patrimoniale IA : projection 5 / 10 ans basée sur l'historique
- Gestion immobilière : biens en location, revenus, charges, rentabilité, assistance IA
- Gestion des emprunts : échéancier, capital restant dû, coût total
- Webhooks configurables : alertes budget / variation d'actifs → Discord, Slack, etc.
- Intégration WhatsApp via Wingman : ajout de transactions par message, onboarding guidé et simplifié

### Q. Intégration comptabilité *(segment pro à haute valeur LTV)*

- Export compatible : Pennylane, QuickBooks, et format FEC (Fichier des Écritures Comptables — standard légal français)
- Ciblé pour les indépendants, freelances et professions libérales
- Récapitulatif annuel structuré prêt à transmettre à un expert-comptable (catégories, TVA si applicable, soldes par période)
- Disponible en Max uniquement

### R. Enrichissement du back-office Admin *(s'appuie sur le back-office Phase 1 déjà livré)*

- Reporting parrainage : parrainages actifs, conversions, LTV estimée des filleuls
- Statistiques d'usage globales : utilisateurs actifs, taux de conversion par palier, features les plus utilisées
- Outils de modération avancés : export de la base utilisateurs, alertes sur comportements suspects (anti-abus parrainage)

---

## CE QUE J'ATTENDS EN RÉPONSE À CE MESSAGE

1. **Confirmation de compréhension** du cahier des charges complet, des trois phases et de toutes les features (A → R)
2. **Audit de sécurité** détaillé (point 2)
3. **Recommandation d'architecture** Mobile + Web, assumée et justifiée (point 3)
4. **Recommandation de stack back-end / BDD** avec coûts estimés par scénario (point 3c)
5. **Guide de publication** complet adapté à l'architecture recommandée (point 4)
6. **Plan d'action Phase 1** détaillé (A → E) — prêt à valider avant tout code
7. **Positionnement des features Phase 2 et 3** dans la roadmap : ordre recommandé, dépendances techniques entre les blocs, et estimation de charge globale

> ⚠️ Tu n'écris aucune ligne de code tant que je n'ai pas validé le plan.
