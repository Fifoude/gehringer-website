# 🌐 Documentation Frontend - Site Web Gehringer Conseil

## 🧠 Guide d’utilisation pour l’IA

- Ce document décrit **le frontend Astro** du site gehringer.fr.
- Quand l’utilisateur demande :
  - d’ajouter une page → voir section “Ajouter une nouvelle page”
  - de modifier la page /solar → voir section “solar.astro – Tableau de bord solaire”
  - des infos sur le déploiement → voir section “🚀 Déploiement Netlify”.
- Toujours respecter :
  - l’utilisation d’Astro 5 et Tailwind CSS 4
  - le design system décrit en fin de document
  - les contraintes RGPD décrites dans la politique de confidentialité.

## 🎯 Objectif de ce document

Ce document décrit l'architecture, le fonctionnement et les composants du site web **gehringer.fr**, développé avec Astro, Tailwind CSS et déployé sur Netlify. Il est destiné aux développeurs et IA qui doivent maintenir, améliorer ou étendre le site.

---

## 📋 Vue d'ensemble

### Informations générales
- **URL de production**: https://www.gehringer.fr
- **Repository GitHub**: Fifoude/gehringer-website
- **Framework**: Astro 5.15.3
- **Styling**: Tailwind CSS 4.1.16
- **Graphiques**: Recharts 3.3.0
- **Hébergement**: Netlify
- **Déploiement**: Automatique via GitHub → Netlify

### Architecture technique
```
gehringer-website/
### **netlify.toml** - Configuration déploiement

```toml
[build]
  command = "npm run build"     # Commande de build Astro
  publish = "dist"              # Dossier de sortie Astro
  functions = "netlify/functions"  # Dossier Netlify Functions

[functions]
  node_bundler = "esbuild"      # Bundler pour Functions

[[redirects]]
  from = "/api/*"               # Alias pour Functions
  to = "/.netlify/functions/:splat"
  status = 200
```

### Workflow de déploiement

1. **Push GitHub** → Branche `main`
2. **Netlify détecte** le push
3. **Build automatique**:
   ```bash
   npm install
   npm run build  # → astro build
```json
{
  "name": "gehringer-website",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.1.16",
    "astro": "^5.15.3",
    "recharts": "^3.3.0",
    "tailwindcss": "^4.1.16"
  }
}
```

### Scripts disponibles

```bash
# Développement local
npm run dev        # → http://localhost:4321

# Build production
npm run build      # → dist/

# Preview production build
npm run preview    # → http://localhost:4321
```

---

## 🎨 Design System

### Palette de couleurs Tailwind

#### Primaires
- **slate-900**: `#0f172a` - Header, texte principal
- **gray-900**: `#111827` - Boutons CTA
- **gray-700**: `#374151` - Texte secondaire
- **gray-600**: `#4b5563` - Texte descriptif
- **gray-50**: `#f9fafb` - Backgrounds clairs

#### Accents
- **amber-400**: `#fbbf24` - Active links
- **green-500**: `#22c55e` - Graphiques solaires (autoconso)
- **yellow-500**: `#eab308` - Graphiques solaires (taux)
- **blue-600**: `#2563eb` - Graphiques solaires (autonomie)

#### Semantic
- **white**: `#ffffff` - Fonds de cartes
- **transparent**: Pour overlays

### Typographie

#### Polices
- **Base**: System fonts (Tailwind default)
  ```css
  font-family: ui-sans-serif, system-ui, -apple-system, 
               BlinkMacSystemFont, "Segoe UI", Roboto, ...
  ```

- **Logo** (`.font-logo`): "Great Vibes", cursive
  ```css
  font-family: "Great Vibes", cursive;
  font-size: 2rem;
  font-weight: 400;
  ```

#### Échelle de tailles
- **text-xs**: 0.75rem (12px) - Notes, disclaimers
- **text-sm**: 0.875rem (14px) - Labels, navigation
- **text-base**: 1rem (16px) - Corps de texte
- **text-lg**: 1.125rem (18px) - Sous-titres
- **text-xl**: 1.25rem (20px) - Titres sections
- **text-2xl**: 1.5rem (24px) - Titres cartes
- **text-5xl**: 3rem (48px) - Titres pages principales

### Spacing

#### Padding/Margin courants
- **px-6**: 1.5rem (24px) - Padding horizontal pages
- **py-16**: 4rem (64px) - Padding vertical sections
- **gap-8**: 2rem (32px) - Gap grilles
- **mb-12**: 3rem (48px) - Margin bottom titres

### Composants UI récurrents

#### Boutons CTA
```css
.cta-button {
  @apply bg-gray-900 text-white px-8 py-3 
         rounded-xl hover:bg-gray-700 transition;
}
```

#### Cartes (services, expériences)
```css
.card {
  @apply bg-white rounded-2xl shadow-md p-8 
         hover:shadow-lg transition;
}
```

#### Sections principales
```css
.section {
  @apply max-w-5xl mx-auto px-6 py-16;
}
```

#### Titres de page
```css
.page-title {
  @apply font-logo text-5xl text-center text-gray-900 mb-12;
}
```

---

## 🔍 SEO & Performance

### Optimisations SEO

#### Meta tags essentiels
- Title unique par page
- Description optimisée (150-160 caractères)
- Open Graph complet (OG:title, OG:description, OG:image)
- Twitter Cards
- Canonical URLs automatiques
- Lang="fr" sur `<html>`

#### Sitemap & Robots
**⚠️ À ajouter**:
```xml
<!-- public/robots.txt -->
User-agent: *
Allow: /
Disallow: /solar

Sitemap: https://www.gehringer.fr/sitemap.xml
```

```xml
<!-- public/sitemap.xml (à générer) -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.gehringer.fr/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.gehringer.fr/services</loc>
    <priority>0.8</priority>
  </url>
  <!-- etc. -->
</urlset>
```

#### Structured Data (JSON-LD)
**⚠️ À ajouter** pour améliorer SEO:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Gehringer Conseil",
  "description": "Management de transition et conseil RSE",
  "url": "https://www.gehringer.fr",
  "email": "web.contact@gehringer.fr",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Suresnes",
    "addressRegion": "Île-de-France",
    "addressCountry": "FR"
  },
  "founder": {
    "@type": "Person",
    "name": "Philippe Gehringer",
    "jobTitle": "Manager de transition",
    "sameAs": "https://www.linkedin.com/in/pgehringer"
  }
}
</script>
```

### Performance

#### Scores Lighthouse cibles
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 100

#### Optimisations actuelles
- ✅ Images optimisées (`/images/PG.jpg` responsive)
- ✅ CSS minimal (Tailwind purgé automatiquement par Astro)
- ✅ Pas de JavaScript lourd côté client
- ✅ Fonts préchargées (Great Vibes)
- ✅ SSG (Static Site Generation) via Astro
- ✅ CDN Netlify

#### Améliorations possibles
- ⚠️ Lazy loading images: `loading="lazy"`
- ⚠️ WebP format pour images
- ⚠️ Preconnect Google Fonts:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```

---

## 🔐 Sécurité & RGPD

### Conformité RGPD

#### Points clés
1. **Collecte données minimale**
   - Formulaire contact uniquement
   - Pas de cookies analytics/tracking

2. **Consentement explicite**
   - Soumission formulaire = consentement
   - Mention sur page contact

3. **Droits utilisateurs**
   - Accès, rectification, suppression via email
   - Délai: 12 mois de conservation

4. **Politique de confidentialité**
   - Page dédiée `/politique-confidentialite`
   - Lien dans footer

5. **Mentions légales**
   - Page dédiée `/mentions-legales`
   - SIREN, TVA, hébergeur

#### Netlify Forms et RGPD
- Données stockées en Europe (si configuré)
- Chiffrement HTTPS
- Accès restreint (compte Netlify)
- Exportation possible (CSV)

### Sécurité

#### Headers de sécurité (à ajouter dans netlify.toml)
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

#### HTTPS
- ✅ Certificat SSL automatique Netlify (Let's Encrypt)
- ✅ Redirection HTTP → HTTPS
- ✅ HSTS activé par défaut

#### API APsystems
- ✅ Credentials jamais exposés (variables Netlify)
- ✅ Appels API depuis backend (Netlify Function)
- ✅ CORS configuré
- ⚠️ `rejectUnauthorized: false` (SSL APsystems non vérifié)

---

## 🧪 Tests & Debugging

### Tests locaux

#### Développement
```bash
npm run dev
# → http://localhost:4321
# Hot reload activé
```

#### Preview production
```bash
npm run build
npm run preview
# → http://localhost:4321
# Simule environnement production
```

### Debugging Netlify Functions localement

⚠️ **Important**: Avant tout déploiement sur Netlify via GitHub, il est **impératif** de tester le site avec `netlify dev` pour s'assurer de la compatibilité avec l'environnement Netlify.

#### Installer Netlify CLI
```bash
npm install -g netlify-cli
```

#### Démarrer avec Functions (environnement Netlify local)
```bash
netlify dev
# → http://localhost:8888
# Functions disponibles sur /.netlify/functions/*
# Simule exactement l'environnement de production Netlify
```

**Différences avec `npm run dev`**:
- `npm run dev` → Port 4321, environnement Astro pur
- `netlify dev` → Port 8888, environnement Netlify complet (avec Functions, redirections, etc.)

**Quand utiliser `netlify dev`**:
- ✅ Avant chaque push vers GitHub/Netlify
- ✅ Test des Netlify Functions
- ✅ Test du formulaire de contact Netlify Forms
- ✅ Vérification des redirections (netlify.toml)
- ✅ Test des variables d'environnement

#### Variables d'environnement locales
Créer `.env` (gitignored):
```bash
APSYSTEMS_APP_ID=your_test_app_id
APSYSTEMS_APP_SECRET=your_test_app_secret
APSYSTEMS_SYSTEM_ID=AZ12649A3DFF
```

### Logs de débogage

#### Console navigateur
```javascript
// Dans solar.astro
console.log('Requête vers:', fullUrl);
console.error('Erreur:', error);
```

#### Netlify Function logs
```javascript
// Dans apsystems.js
console.log('Requête vers:', fullUrl);
console.error('Erreur:', error);
```

Consultables dans: **Netlify Dashboard → Functions → Logs**

---

## 🌍 Internationalisation (i18n)

### État actuel
- **Langue unique**: Français (fr)
- `<html lang="fr">`
- Pas de système i18n

### Préparation future i18n

#### Structure recommandée
```
src/
├── pages/
│   ├── fr/
│   │   ├── index.astro
│   │   ├── services.astro
│   │   └── ...
│   └── en/
│       ├── index.astro
│       ├── services.astro
│       └── ...
├── i18n/
│   ├── fr.json
│   └── en.json
```

#### Configuration Astro i18n
```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en"],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
```

---

## 📊 Analytics & Monitoring

### État actuel
- ❌ Aucun analytics activé
- ❌ Pas de cookies tracking

### Options recommandées (RGPD-friendly)

#### 1. Plausible Analytics (recommandé)
- ✅ Sans cookies
- ✅ Conforme RGPD sans bandeau
- ✅ Léger (< 1 KB)
- ✅ Open source

**Installation**:
```html
<!-- Dans Layout.astro <head> -->
<script defer data-domain="gehringer.fr" 
  src="https://plausible.io/js/script.js"></script>
```

#### 2. Netlify Analytics
- ✅ Intégré Netlify
- ✅ Server-side (pas de script client)
- ✅ RGPD-compliant
- ⚠️ Payant ($9/mois)

#### 3. Umami (self-hosted)
- ✅ Open source
- ✅ Sans cookies
- ✅ Self-hosted possible
- ⚠️ Nécessite serveur

---

## 🐛 Problèmes connus & Solutions

### 1. Page `/solar` non protégée
**Problème**: Page accessible publiquement, contient données privées.

**Solutions possibles**:
- **Option A**: Authentification basique HTTP
  ```toml
  # netlify.toml
  [[redirects]]
    from = "/solar"
    to = "/solar"
    status = 200
    force = true
    conditions = {Role = ["admin"]}
  ```

- **Option B**: Protection par mot de passe JavaScript
  ```javascript
  // solar.astro
  const PASSWORD = import.meta.env.SOLAR_PASSWORD;
  // Prompt utilisateur
  ```

- **Option C**: Déplacer vers domaine séparé

### 2. Netlify Forms spam
**Problème**: Formulaire contact peut recevoir spam.

**Solutions actuelles**:
- ✅ Honeypot `bot-field` activé

**Améliorations possibles**:
- Ajouter reCAPTCHA v3 (invisible)
- Filtrage Netlify Forms spam (dashboard)

### 3. APsystems API SSL non vérifié
**Problème**: `rejectUnauthorized: false` dans apsystems.js

**Impact**: Risque man-in-the-middle (faible car HTTPS)

**Solution**: Vérifier certificat APsystems
```javascript
// Si certificat valide
rejectUnauthorized: true
```

### 4. Images non optimisées
**Problème**: `/images/PG.jpg` non compressé/optimisé

**Solution**: Utiliser Astro Image
```astro
---
import { Image } from 'astro:assets';
import pgPhoto from '../assets/PG.jpg';
---
<Image src={pgPhoto} alt="Philippe Gehringer" 
       width={640} format="webp" />
```

---

## 🚧 Roadmap & Évolutions futures

### Court terme (v1.1)

#### SEO
- [ ] Ajouter `robots.txt`
- [ ] Générer `sitemap.xml` automatique
- [ ] Ajouter JSON-LD structured data
- [ ] Optimiser meta descriptions

#### Performance
- [ ] Convertir images en WebP
- [ ] Lazy loading images
- [ ] Preconnect Google Fonts
- [ ] Minifier CSS/JS

#### Sécurité
- [ ] Ajouter headers sécurité (CSP, etc.)
- [ ] Protéger page `/solar`
- [ ] Vérifier SSL APsystems

### Moyen terme (v1.2)

#### Fonctionnalités
- [ ] Intégrer graphiques Recharts sur `/solar`
- [ ] Ajouter page blog/actualités
- [ ] Section témoignages clients
- [ ] Newsletter (Mailchimp/Sendinblue)

#### Analytics
- [ ] Intégrer Plausible Analytics
- [ ] Tracking conversions formulaire
- [ ] Heatmaps (Hotjar)

### Long terme (v2.0)

#### i18n
- [ ] Version anglaise du site
- [ ] Système de traduction Astro i18n

#### Backend
- [ ] Dashboard complet données solaires
- [ ] Historique n8n → site web
- [ ] API publique (partielle)

#### CMS
- [ ] Intégrer CMS headless (Strapi/Sanity)
- [ ] Gestion contenu blog
- [ ] Administration autonome

---

## 📖 Guide de maintenance

### Ajouter une nouvelle page

**Étape 1**: Créer fichier dans `src/pages/`
```astro
---
// src/pages/nouvelle-page.astro
import Layout from '../layouts/Layout.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
---
<Layout title="Nouvelle Page – Gehringer Conseil" 
        description="Description de la nouvelle page">
  <Header slot="header" />
  
  <section class="max-w-5xl mx-auto px-6 py-16">
    <h1 class="font-logo text-5xl text-center text-gray-900 mb-12">
      Titre de la page
    </h1>
    
    <!-- Contenu -->
  </section>
  
  <Footer slot="footer" />
</Layout>
```

**Étape 2**: Ajouter lien dans Header.astro
```astro
<a href="/nouvelle-page" 
   class={currentPath === '/nouvelle-page' ? 'text-amber-400 underline' : ''}>
  Nouvelle Page
</a>
```

**Étape 3**: Tester localement
```bash
npm run dev
```

**Étape 4**: Commit & push
```bash
git add .
git commit -m "Ajout page Nouvelle Page"
git push origin main
```

### Modifier les coordonnées de contact

**Fichier**: `src/config/siteInfo.ts`
```typescript
export const siteInfo = {
  name: "Gehringer Conseil",
  email: "nouveau-email@gehringer.fr",  // Modifier ici
  phone: "+33 X XX XX XX XX",           // Modifier ici
  linkedin: "https://linkedin.com/...",  // Modifier ici
  location: "Nouvelle ville"             // Modifier ici
};
```

Les changements se propagent automatiquement sur:
- Footer
- Page Contact
- Mentions légales
- Politique de confidentialité

### Mettre à jour les variables Netlify

**Netlify Dashboard** → Site → **Environment Variables**

1. Cliquer sur variable à modifier
2. Modifier la valeur
3. Sauvegarder
4. Redéployer le site (si nécessaire)

**⚠️ Note**: Changements de variables nécessitent redéploiement.

### Modifier le style global

**Fichier**: `src/styles/global.css`

Exemple: Changer couleur primaire
```css
/* Avant */
.cta-button {
  @apply bg-gray-900 hover:bg-gray-700;
}

/* Après */
.cta-button {
  @apply bg-blue-900 hover:bg-blue-700;
}
```

**⚠️ Rechercher/Remplacer**: Vérifier tous les usages de `gray-900` dans le projet.

---

## 🛠️ Outils de développement

### VS Code Extensions recommandées
- **Astro** (astro-build.astro-vscode)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)

### Configuration VS Code (`.vscode/settings.json`)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[astro]": {
    "editor.defaultFormatter": "astro-build.astro-vscode"
  },
  "tailwindCSS.experimental.classRegex": [
    ["class:\\s*?[\"'`]([^\"'`]*).*?,", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Git hooks (recommandé)
```bash
# Installer husky
npm install -D husky

# Pre-commit: build test
npx husky add .husky/pre-commit "npm run build"
```

---

## 📚 Ressources & Documentation

### Documentation officielle
Développeur
    │
    │ git push
    ▼
GitHub (main branch)
    │
    │ Webhook
    ▼
Netlify Build
    │
    ├─→ npm install
    ├─→ npm run build (astro build)
    ├─→ Deploy dist/ → CDN
    └─→ Deploy functions/ → Serverless
    │
    ▼
Production (gehringer.fr)
```

---

## 🎓 Conventions de code

### Naming conventions

#### Fichiers
- **Pages**: `kebab-case.astro` (ex: `mentions-legales.astro`)
- **Composants**: `PascalCase.astro` (ex: `Header.astro`)
- **Config**: `camelCase.ts` (ex: `siteInfo.ts`)
- **Functions**: `kebab-case.js` (ex: `apsystems.js`)

#### Classes CSS
- **Tailwind**: Utiliser classes utilitaires
- **Custom**: `kebab-case` (ex: `.font-logo`)

#### Variables JavaScript
- **Constantes**: `SCREAMING_SNAKE_CASE` (ex: `APSYSTEMS_APP_ID`)
- **Variables**: `camelCase` (ex: `appId`, `systemData`)
- **Functions**: `camelCase` (ex: `formatFr()`, `makeRequest()`)

### Structure des composants Astro

```astro
---
// 1. Imports
import Layout from '../layouts/Layout.astro';
import { siteInfo } from '../config/siteInfo';

// 2. Props et types
interface Props {
  title?: string;
}

// 3. Logic
const { title = 'Default' } = Astro.props;
const currentPath = Astro.url.pathname;
---

<!-- 4. Template -->
<Layout {title}>
  <section class="max-w-5xl mx-auto px-6 py-16">
    <!-- Contenu -->
  </section>
</Layout>

<!-- 5. Styles scoped (si nécessaire) -->
<style>
  /* Styles spécifiques au composant */
</style>

<!-- 6. Scripts client-side (si nécessaire) -->
<script>
  // JavaScript exécuté côté client
</script>
```

### Commentaires

#### Bonnes pratiques
```astro
---
// ✅ Expliquer le "pourquoi", pas le "quoi"
// Conversion timezone UTC → Paris pour affichage correct
const parisTime = utcTime.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

// ❌ Éviter commentaires évidents
// Créer une variable pour l'email
const email = siteInfo.email;
---

<!-- ✅ Sections importantes -->
<!-- Formulaire de contact Netlify Forms -->
<form data-netlify="true">
  <!-- ... -->
</form>

<!-- ❌ Éviter HTML commenté inutilement -->
<!-- <div>Vieux code</div> -->
```

---

## 🔍 Checklist avant déploiement

### Pre-push checklist
- [ ] `netlify dev` passe sans erreur (environnement compatible Netlify sur localhost:8888)
- [ ] `npm run build` passe sans erreur
- [ ] Test visuel de toutes les pages modifiées
- [ ] Vérification responsive (mobile/tablet/desktop)
- [ ] Validation HTML (https://validator.w3.org)
- [ ] Test formulaire contact
- [ ] Vérification liens (pas de 404)
- [ ] SEO: titles/descriptions uniques
- [ ] Accessibilité: alt sur images

### Pre-production checklist
- [ ] Variables Netlify configurées
- [ ] Domaine custom configuré
- [ ] HTTPS activé
- [ ] Redirection www → non-www (ou inverse)
- [ ] robots.txt présent
- [ ] sitemap.xml généré
- [ ] Google Search Console configuré
- [ ] Analytics configuré (si souhaité)
- [ ] Backup GitHub à jour

---

## 📞 Support & Contact

### Pour questions techniques
- **Email**: web.contact@gehringer.fr
- **GitHub Issues**: https://github.com/Fifoude/gehringer-website/issues

### Ressources support
- **Astro Discord**: https://astro.build/chat
- **Netlify Support**: https://answers.netlify.com
- **Stack Overflow**: Tag `astro` ou `netlify`

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2024-11-XX | 1.0.0 | Lancement initial du site |
| 2025-11-21 | 1.0.1 | Ajout page `/solar` (privée) |
| 2025-11-21 | 1.0.2 | Documentation frontend complète |

---

## 📄 Licence

**Propriétaire**: Philippe Gehringer – Gehringer Conseil  
**Copyright**: © 2024-2025 Gehringer Conseil. Tous droits réservés.

**Code source**: Propriétaire (non open source)  
**Contenu**: Propriétaire, reproduction interdite sans autorisation

---

**Document généré pour**: Exploitation par IA/développeurs  
**Dernière mise à jour**: 21 novembre 2025  
**Version**: 1.0.0