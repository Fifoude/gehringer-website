# 📦 Guide d'installation complet - APsystems Integration

Guide pas à pas vérifié pour intégrer l'API APsystems dans votre projet Astro.

## 📁 Structure du projet

Voici l'arborescence complète des fichiers à créer :

```
votre-projet/
├── src/
│   ├── lib/
│   │   ├── apsystems-client.ts           ⭐ À créer
│   │   ├── aps-data-transformer.ts       ⭐ À créer
│   │   └── aps-cache.ts                  ⭐ À créer (optionnel)
│   ├── types/
│   │   └── apsystems-types.ts            ⭐ À créer
│   ├── components/
│   │   └── SolarCharts.jsx               ✅ Déjà créé
│   └── pages/
│       └── solar.astro                   ⭐ À mettre à jour
├── scripts/
│   └── test-aps-connection.ts            ⭐ À créer
├── .env.example                          ⭐ À créer
├── .env                                  ⭐ À créer (ne pas commiter)
├── package.json                          ⭐ À modifier
├── QUICKSTART.md                         📚 Documentation
├── README-APSYSTEMS.md                   📚 Documentation
└── INSTALLATION.md                       📚 Ce fichier
```

---

## 🔧 Installation étape par étape

### Étape 1 : Créer les dossiers nécessaires

```bash
# À la racine de votre projet
mkdir -p src/lib
mkdir -p src/types
mkdir -p scripts
```

### Étape 2 : Créer les fichiers

#### 2.1 - Créer `.env.example`

```bash
cat > .env.example << 'EOF'
# Configuration APsystems OpenAPI
APSYSTEMS_APP_ID=
APSYSTEMS_APP_SECRET=
APSYSTEMS_SYSTEM_ID=
EOF
```

#### 2.2 - Copier et configurer `.env`

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos identifiants
nano .env
# ou
code .env
```

Remplissez avec vos vraies valeurs :
```bash
APSYSTEMS_APP_ID=votre_app_id_32_caracteres
APSYSTEMS_APP_SECRET=votre_app_secret_32_caracteres
APSYSTEMS_SYSTEM_ID=votre_system_id
```

#### 2.3 - Créer les fichiers TypeScript

Copiez le contenu des artifacts que je vous ai fournis dans les fichiers suivants :

1. **`src/lib/apsystems-client.ts`**
2. **`src/lib/aps-data-transformer.ts`**
3. **`src/types/apsystems-types.ts`**
4. **`scripts/test-aps-connection.ts`**
5. **`src/lib/aps-cache.ts`** (optionnel)

#### 2.4 - Mettre à jour `solar.astro`

Remplacez le contenu de `src/pages/solar.astro` avec la version qui utilise les vraies données.

### Étape 3 : Installer les dépendances

```bash
# Installer tsx pour exécuter les scripts TypeScript
npm install --save-dev tsx
```

### Étape 4 : Modifier `package.json`

Ajoutez le script de test dans la section `"scripts"` de votre `package.json` :

```json
{
  "name": "votre-projet",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test:aps": "tsx scripts/test-aps-connection.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

### Étape 5 : Tester la connexion

```bash
npm run test:aps
```

**Résultat attendu :**
```
🔄 Test de connexion à l'API APsystems...

📡 Création du client API...
✅ Client créé avec succès

📊 Récupération des détails du système...
✅ Détails du système :
   - System ID: AZ12649A3DFF
   - Capacité: 1.28 kWp
   ...

═══════════════════════════════════════════════════
✨ TOUS LES TESTS ONT RÉUSSI ! ✨
═══════════════════════════════════════════════════
```

### Étape 6 : Lancer le serveur

```bash
npm run dev
```

Ouvrez votre navigateur : **http://localhost:4321/solar**

---

## ✅ Checklist de vérification

Cochez au fur et à mesure :

### Fichiers créés
- [ ] `src/lib/apsystems-client.ts` existe
- [ ] `src/lib/aps-data-transformer.ts` existe
- [ ] `src/types/apsystems-types.ts` existe
- [ ] `scripts/test-aps-connection.ts` existe
- [ ] `.env` existe et contient vos identifiants
- [ ] `.env.example` existe (template)

### Configuration
- [ ] `.env` contient `APSYSTEMS_APP_ID`
- [ ] `.env` contient `APSYSTEMS_APP_SECRET`
- [ ] `.env` contient `APSYSTEMS_SYSTEM_ID`
- [ ] Les 3 valeurs sont remplies (pas vides)
- [ ] Pas d'espaces ou de guillemets autour des valeurs

### Dependencies
- [ ] `tsx` est installé : `npm list tsx`
- [ ] Script `test:aps` existe dans `package.json`

### Tests
- [ ] `npm run test:aps` s'exécute sans erreur
- [ ] Le test affiche vos vraies données système
- [ ] Pas d'erreur d'authentification

### Serveur
- [ ] `npm run dev` démarre sans erreur
- [ ] La page `/solar` se charge
- [ ] Les graphiques affichent des données

---

## 🐛 Résolution des problèmes courants

### Problème : `Cannot find module 'tsx'`

```bash
# Solution
npm install --save-dev tsx
```

### Problème : `Cannot find module '../src/lib/apsystems-client'`

```bash
# Vérifiez que le fichier existe
ls -la src/lib/apsystems-client.ts

# Si absent, créez-le avec le contenu fourni
```

### Problème : Le script ne trouve pas le fichier

```bash
# Vérifiez le chemin
ls -la scripts/test-aps-connection.ts

# Le fichier doit être dans le dossier scripts/
# PAS dans src/scripts/
```

### Problème : `Missing APsystems credentials`

```bash
# Vérifiez que .env existe
cat .env

# Vérifiez que les variables sont bien nommées
# APSYSTEMS_APP_ID (pas APP_ID)
# APSYSTEMS_APP_SECRET (pas APP_SECRET)
# APSYSTEMS_SYSTEM_ID (pas SYSTEM_ID)

# Relancez le serveur après modification
npm run dev
```

### Problème : Erreur d'import dans Astro

```typescript
// Vérifiez que vous utilisez bien import.meta.env
const appId = import.meta.env.APSYSTEMS_APP_ID;

// PAS process.env (ça c'est Node.js uniquement)
```

### Problème : TypeScript errors

```bash
# Si erreurs TypeScript, vérifiez tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022"
  }
}
```

---

## 📝 Commandes de diagnostic

Si quelque chose ne fonctionne pas, lancez ces commandes :

```bash
# 1. Vérifier la structure
tree -L 3 -I 'node_modules'

# 2. Vérifier les fichiers créés
ls -la src/lib/
ls -la src/types/
ls -la scripts/

# 3. Vérifier .env
cat .env | grep APSYSTEMS

# 4. Vérifier package.json
cat package.json | grep test:aps

# 5. Vérifier tsx
npm list tsx

# 6. Test complet
npm run test:aps
```

---

## 🎯 Prochaines étapes

Une fois que tout fonctionne :

1. **Testez pendant la journée** (10h-16h) pour voir la production réelle
2. **Personnalisez le dashboard** selon vos besoins
3. **Ajoutez le cache** pour optimiser les appels API
4. **Configurez un rafraîchissement automatique**
5. **Déployez en production**

---

## 📚 Fichiers de référence

- **`QUICKSTART.md`** - Guide rapide en 3 étapes
- **`README-APSYSTEMS.md`** - Documentation technique complète
- **Manuel API** - `Apsystems_OpenAPI_User_Manual_End_User_EN.pdf`

---

## 💡 Conseils

### Ordre d'exécution recommandé

1. ✅ Créer tous les fichiers
2. ✅ Configurer `.env`
3. ✅ Installer `tsx`
4. ✅ Tester avec `npm run test:aps`
5. ✅ Lancer `npm run dev`

### Ne pas oublier

- **Ne commitez JAMAIS le `.env`** sur Git
- Ajoutez `.env` dans `.gitignore`
- Utilisez `.env.example` comme template pour l'équipe
- Testez d'abord avec le script avant de lancer le serveur

### Git

```bash
# Ajoutez dans .gitignore
echo ".env" >> .gitignore

# Commitez .env.example
git add .env.example
git commit -m "Add APsystems configuration template"
```

---

Besoin d'aide ? Relisez les sections de dépannage ou consultez la documentation complète ! 🚀