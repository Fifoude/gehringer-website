# Notes de Sécurité - APsystems API

## ⚠️ IMPORTANT: Secrets Détectés et Supprimés

### Problème Identifié
Le **1er décembre 2025**, Netlify a détecté des secrets hardcodés dans les fichiers de workflows n8n et a bloqué le build pour des raisons de sécurité.

### Secrets Concernés
Les credentials API APsystems suivants étaient hardcodés dans les workflows n8n:
- `APSYSTEMS_APP_ID`: `2c9f95c7951d4ca201952a4c0f88026f`
- `APSYSTEMS_APP_SECRET`: `2a4c0f87026e`
- `APSYSTEMS_SYSTEM_ID`: `D19H831159936795`
- `ECU_PV`: `215000046433`

### Actions Effectuées

1. ✅ **Ajout de `n8n/` au `.gitignore`**
   - Les workflows n8n ne sont plus trackés par Git
   - Les fichiers restent disponibles localement pour votre usage

2. ✅ **Suppression des fichiers du repository**
   - Tous les workflows n8n ont été retirés du repository GitHub
   - Commit: `5f369cb` - "Remove n8n workflows with hardcoded secrets from repository"

3. ✅ **Push vers GitHub**
   - Les changements ont été poussés avec succès
   - Le repository ne contient plus de secrets hardcodés

### ⚡ Action Critique Requise: ROTATION DES SECRETS

**VOUS DEVEZ ABSOLUMENT** régénérer de nouveaux credentials APsystems car les anciens ont été exposés dans l'historique Git public. Les secrets ont été commités dans le passé et sont donc potentiellement compromis.

#### Étapes de Rotation:
1. Connectez-vous à votre compte APsystems
2. Générez de **nouveaux** credentials (App ID, App Secret)
3. Mettez à jour vos workflows n8n **locaux** avec les nouveaux credentials
4. Configurez les nouvelles variables d'environnement dans Netlify:
   - Allez dans: Site settings → Build & deploy → Environment → Environment variables
   - Mettez à jour: `APSYSTEMS_APP_ID`, `APSYSTEMS_APP_SECRET`, `APSYSTEMS_SYSTEM_ID`
5. Révoquez les anciens credentials dans votre compte APsystems

### 📋 Bonnes Pratiques pour l'Avenir

#### Dans les Workflows n8n
Utilisez **TOUJOURS** les variables d'environnement au lieu de valeurs hardcodées:

```javascript
// ✅ BON - Utilise les variables d'environnement
const appId = $env.APSYSTEMS_APP_ID;
const appSecret = $env.APSYSTEMS_APP_SECRET;
const systemId = $env.APSYSTEMS_SYSTEM_ID;

// ❌ MAUVAIS - Valeurs hardcodées (ne jamais faire!)
const appId = '2c9f95c7951d4ca201952a4c0f88026f';
const appSecret = '2a4c0f87026e';
```

#### Variables d'Environnement Netlify
Les variables suivantes doivent être configurées dans Netlify (jamais committées):
- `APSYSTEMS_APP_ID`
- `APSYSTEMS_APP_SECRET`
- `APSYSTEMS_SYSTEM_ID`
- `NETLIFY_EMAILS_SECRET` (si utilisé)

### 🔍 Fichiers Concernés (Maintenant Exclus du Git)

Les fichiers suivants sont maintenant dans `.gitignore` et ne seront plus commités:
- `n8n/[SUB] APsystems - Données Quotidiennes.json`
- `n8n/[SUB] APsystems - Données Horaires.json`
- Tous les autres workflows dans le répertoire `n8n/`

### 📝 Historique Git

⚠️ **Note importante**: Même si les fichiers ont été supprimés, ils existent toujours dans l'historique Git. Pour une sécurité maximale, vous devriez:

1. Utiliser `git filter-repo` ou BFG Repo-Cleaner pour purger l'historique (optionnel mais recommandé)
2. **Obligatoire**: Rotation immédiate de tous les secrets APsystems

### 🔗 Références
- [Netlify Secrets Scanning Documentation](https://docs.netlify.com/configure-builds/environment-variables/#secrets-scanning)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

**Date de Création**: 2025-12-01  
**Dernière Mise à Jour**: 2025-12-01  
**Statut**: ⚠️ ROTATION DES SECRETS REQUISE
