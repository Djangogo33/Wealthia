(NE PAS TENIR COMPTE)

# Guide complet — Wealthia sur Android

---

## 1. Cloner le repo en local

Ouvre VS Code, puis ouvre le terminal intégré (` Ctrl + ` `).

Tape :
```bash
git clone https://github.com/TON_USERNAME/wealthia.git
cd wealthia
```

> 💡 L'URL exacte est sur GitHub → bouton vert **Code** → copie l'URL HTTPS.

---

## 2. Installer les dépendances

```bash
npm install
```

> 💡 Ça télécharge tous les outils dont ton projet a besoin. Ça peut prendre 2-3 minutes. Des lignes défilent, c'est normal.

---

## 3. Installer Capacitor

Capacitor est l'outil qui va transformer ton site en app mobile. Tape dans le terminal :

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

Quand il te pose des questions :
- **App name** → `Wealthia`
- **App ID** → `com.wealthia.app` (c'est un identifiant unique, comme une adresse)
- **Web dir** → `dist` (c'est là où ton site est buildé)

---

## 4. Builder le projet

Avant d'ajouter Android, il faut "construire" ton site en version optimisée :

```bash
npm run build
```

> 💡 Ça crée un dossier `dist/` avec ton site prêt à être emballé dans l'app.

---

## 5. Ajouter la plateforme Android

```bash
npm install @capacitor/android
npx cap add android
```

> 💡 Ça crée un dossier `android/` dans ton projet. C'est le projet Android natif généré automatiquement.

---

## 6. Synchroniser ton site avec Android

À chaque fois que tu modifies ton site, tu devras faire :

```bash
npm run build
npx cap sync android
```

> 💡 `sync` copie ton site buildé dans le projet Android. À retenir, tu en auras besoin souvent.

---

## 7. Ouvrir dans Android Studio

```bash
npx cap open android
```

> 💡 Ça ouvre automatiquement Android Studio avec ton projet. Si c'est la première fois, Android Studio va télécharger des outils supplémentaires (SDK, Gradle). Laisse-le faire, ça peut prendre 10-15 minutes.

---

## 8. Configurer le nom, l'icône et le splash screen

### Nom de l'app
Dans Android Studio, ouvre le fichier :
```
android/app/src/main/res/values/strings.xml
```
Tu verras :
```xml
<string name="app_name">Wealthia</string>
```
Change si besoin.

### Icône
Installe le plugin officiel :
```bash
npm install @capacitor/assets
```

Crée un dossier `assets/` à la racine de ton projet et mets dedans :
- `icon.png` → 1024x1024px (ton logo)
- `splash.png` → 2732x2732px (écran de chargement)

Puis génère automatiquement toutes les tailles :
```bash
npx capacitor-assets generate --android
```

> 💡 Ça génère toutes les icônes aux bonnes dimensions pour Android automatiquement. Tu n'as pas à le faire manuellement.

---

## 9. Tester sur émulateur ou vrai téléphone

### Option A — Émulateur (sans téléphone)
Dans Android Studio :
1. Clique sur **Device Manager** (icône téléphone en haut à droite)
2. Clique **Create Device**
3. Choisis un modèle (ex: Pixel 7)
4. Télécharge une version Android (ex: API 34)
5. Clique **Play** ▶️

### Option B — Vrai téléphone (recommandé)
Sur ton téléphone Android :
1. Va dans **Paramètres → À propos du téléphone**
2. Tape **7 fois** sur **Numéro de build** → ça active le mode développeur
3. Va dans **Paramètres → Options développeur**
4. Active **Débogage USB**
5. Branche ton téléphone en USB à ton PC
6. Dans Android Studio, sélectionne ton téléphone dans la liste en haut
7. Clique **Run** ▶️

---

## 10. Créer un compte Google Play Console

👉 Va sur **play.google.com/console**

- Connecte-toi avec un compte Google
- Paye les **25€** (frais uniques, une seule fois pour toujours)
- Remplis les infos du compte développeur (nom, adresse, etc.)

> 💡 La vérification prend parfois 24-48h.

---

## 11. Générer un APK signé

Un APK c'est le fichier d'installation de ton app. Il doit être "signé" pour prouver qu'il vient bien de toi.

### Créer une clé de signature
Dans Android Studio :
1. Menu **Build → Generate Signed Bundle / APK**
2. Choisis **APK**
3. Clique **Create new** pour créer une clé
4. Remplis les infos :
   - **Key store path** → choisis où sauvegarder le fichier (garde-le précieusement ⚠️)
   - **Password** → un mot de passe fort
   - **Alias** → `wealthia-key`
   - **Validity** → `25` ans
   - Les infos personnelles (nom, pays…)
5. Clique **Next → Release → Finish**

> ⚠️ **Sauvegarde ce fichier keystore et ton mot de passe quelque part sûr.** Si tu les perds, tu ne pourras plus mettre à jour ton app sur le Play Store.

---

## 12. Soumettre sur le Play Store

Dans **Google Play Console** :

1. Clique **Créer une application**
2. Remplis les infos :
   - **Nom** : Wealthia
   - **Description courte** (80 caractères max)
   - **Description longue** (4000 caractères max)
   - **Captures d'écran** : minimum 2 screenshots de l'app (fais-les depuis l'émulateur)
   - **Icône** : 512x512px
   - **Bannière** : 1024x500px
3. Va dans **Production → Créer une version**
4. Upload ton fichier APK généré à l'étape 11
5. Clique **Examiner et publier**

---

## 13. Attendre la validation Google

Google vérifie manuellement les nouvelles apps.

- **Délai** : 1 à 3 jours en général
- Tu reçois un email quand c'est approuvé ou refusé
- Si refusé, ils t'expliquent pourquoi et tu peux corriger et resoumettre

---

## Récapitulatif des commandes à retenir

```bash
# Une seule fois
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npx cap add android

# À chaque modification du site
npm run build
npx cap sync android

# Pour ouvrir Android Studio
npx cap open android
```

---

## Les pièges à éviter

- ❌ Ne perds jamais ton fichier **keystore**
- ❌ Ne fais pas `npx cap add android` deux fois
- ✅ Toujours faire `npm run build` avant `npx cap sync`
- ✅ Tester sur vrai téléphone avant de soumettre

---

Tu peux y aller étape par étape et me poser des questions à chaque blocage. 🚀
