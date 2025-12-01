# Configuration Cloudflare Turnstile pour Netlify

## Problème Actuel

Le widget Turnstile ne fonctionne pas en production sur Netlify car vous utilisez une clé de test qui ne fonctionne que sur `localhost`.

## Solution: Créer une Nouvelle Clé Turnstile

### Étape 1: Créer une Application Turnstile sur Cloudflare

1. **Connectez-vous au Dashboard Cloudflare**
   - Allez sur: https://dash.cloudflare.com/
   
2. **Accédez à Turnstile**
   - Dans le menu latéral, cliquez sur **"Turnstile"**
   - Ou allez directement sur: https://dash.cloudflare.com/?to=/:account/turnstile

3. **Créez un nouveau site**
   - Cliquez sur **"Add Site"** ou **"Ajouter un site"**

4. **Configurez votre site**:
   - **Site name (Nom du site)**: `Gehringer Website Chat` (ou un nom de votre choix)
   - **Domain (Domaines autorisés)**: 
     - Ajoutez votre domaine Netlify:  `votre-site.netlify.app`
     - Ajoutez aussi `localhost` pour les tests locaux
     - Si vous avez un domaine custom: `votre-domaine.com`
   - **Widget Mode**: Choisissez **"Managed"** (recommandé)
   
5. **Récupérez vos clés**
   Après la création, vous obtiendrez:
   - **Site Key** (clé publique): commence par `0x4AAAA...`
   - **Secret Key** (clé secrète): à ne jamais exposer publiquement

### Étape 2: Configurer les Variables d'Environnement dans Netlify

1. **Allez dans votre Dashboard Netlify**
   - Site settings → Build & deploy → Environment → Environment variables

2. **Ajoutez les variables suivantes**:

```bash
# Frontend - Clé publique Turnstile (visible côté client)
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA... # Votre vraie site key

# Backend - Sera utilisée par n8n pour vérifier le token
TURNSTILE_SECRET_KEY=0x4AAAA... # Votre vraie secret key
```

⚠️ **IMPORTANT**: 
- `PUBLIC_TURNSTILE_SITE_KEY` est publique (peut être vue par les utilisateurs)
- `TURNSTILE_SECRET_KEY` est privée (ne jamais la committer dans Git)

### Étape 3: Redéployer votre Site

Après avoir ajouté les variables d'environnement:

1. **Clear cache and deploy site** dans Netlify
   - Ou simplement pusher un nouveau commit sur GitHub

2. **Vérifier le déploiement**
   - Allez sur votre site Netlify
   - Ouvrez le chat
   - Le widget Turnstile devrait maintenant s'afficher correctement

### Étape 4: Vérifier le Backend n8n

Votre workflow n8n doit **vérifier le token Turnstile** côté serveur:

```javascript
// Dans votre workflow n8n (action 'auth-init')
const turnstileToken = $input.first().json.turnstileToken;
const turnstileSecret = $env.TURNSTILE_SECRET_KEY;

// Vérifier le token auprès de Cloudflare
const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: turnstileSecret,
    response: turnstileToken
  })
});

const verifyData = await verifyResponse.json();

if (!verifyData.success) {
  throw new Error('Turnstile verification failed');
}

// Continuer avec l'envoi de l'email OTP...
```

## 🔍 Diagnostic - Comment Vérifier

### Dans la Console Navigateur (F12)

Si Turnstile ne fonctionne pas, vous verrez probablement une de ces erreurs:

```
❌ Turnstile: Invalid site key
❌ Turnstile: Domain not allowed
❌ 403 Forbidden
```

### Tester le Widget Manuellement

Vous pouvez tester si votre clé fonctionne avec cette page HTML simple:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Turnstile</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
    <h1>Test Cloudflare Turnstile</h1>
    <div class="cf-turnstile" 
         data-sitekey="VOTRE_SITE_KEY_ICI"
         data-callback="onTurnstileSuccess">
    </div>
    
    <script>
        function onTurnstileSuccess(token) {
            console.log('Turnstile Token:', token);
            alert('Turnstile fonctionne! Token: ' + token.substring(0, 20) + '...');
        }
    </script>
</body>
</html>
```

## 📋 Checklist de Vérification

Cochez au fur et à mesure:

### Configuration Cloudflare
- [ ] Compte Cloudflare créé/accessible
- [ ] Application Turnstile créée
- [ ] Domaine Netlify ajouté aux domaines autorisés
- [ ] Site Key récupérée
- [ ] Secret Key récupérée

### Configuration Netlify
- [ ] `PUBLIC_TURNSTILE_SITE_KEY` ajoutée dans Netlify
- [ ] `TURNSTILE_SECRET_KEY` ajoutée dans Netlify (si utilisée côté n8n)
- [ ] Site redéployé après ajout des variables

### Vérification Frontend
- [ ] Widget Turnstile s'affiche sur le site en production
- [ ] Pas d'erreur dans la console navigateur (F12)
- [ ] Le bouton "Recevoir le code" est activé après validation

### Vérification Backend (n8n)
- [ ] Workflow n8n vérifie le token Turnstile
- [ ] Variable `TURNSTILE_SECRET_KEY` configurée dans n8n
- [ ] Email OTP envoyé après validation Turnstile

## 🛠️ Alternative: Désactiver Temporairement Turnstile

Si vous voulez tester rapidement sans Turnstile, vous pouvez temporairement commenter la vérification:

**Dans ChatWidget.jsx (ligne 107)**:
```javascript
// Temporaire - à retirer en production!
// if (!email || !turnstileToken) return;
if (!email) return; // Skip turnstile check
```

⚠️ **ATTENTION**: Ceci désactive la protection anti-bot! À utiliser uniquement pour debug.

## 📚 Documentation Officielle

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Getting Started with Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
- [Server-side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

---

**Une fois configuré correctement**, le workflow sera:
1. ✅ Utilisateur clique sur le chat
2. ✅ Widget Turnstile s'affiche et vérifie qu'il n'est pas un robot
3. ✅ Utilisateur entre son email
4. ✅ Backend n8n vérifie le token Turnstile
5. ✅ Email OTP envoyé
6. ✅ Utilisateur peut utiliser le chat
