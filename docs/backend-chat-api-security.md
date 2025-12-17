# 🔐 Backend Chat API - Documentation Sécurité & Authentification

Ce document décrit l'architecture de sécurité mise en place pour l'API du Chatbot (n8n + React).

---

## 1. Vue d'ensemble
L'API utilise une approche de sécurité "Defense in Depth" (Défense en profondeur) avec plusieurs couches de protection :
1.  **Validation des Entrées** (Gatekeeper).
2.  **Rate Limiting** (Protection contre les abus).
3.  **Authentification Forte** (OTP Email + Hash).
4.  **Gestion de Session Moderne** (Access Token JWT court + Refresh Token Rotatif).
5.  **Audit Logs** (Traçabilité).

---

## 2. Flux d'Authentification

### 2.1. Initialisation (Auth Init)
*   **Endpoint** : `POST /chat-api` (`action: 'auth-init'`)
*   **Processus** :
    1.  L'utilisateur envoie son email.
    2.  n8n génère un code OTP à 4 chiffres.
    3.  **Hashage** : Le code est immédiatement hashé (SHA-256) avant stockage. Le code brut n'est JAMAIS stocké.
    4.  **Stockage** : Table `OTP_Codes` (Email + Hash + Timestamp).
    5.  **Envoi** : Le code brut est envoyé par email à l'utilisateur.

### 2.2. Vérification (Auth Verify)
*   **Endpoint** : `POST /chat-api` (`action: 'auth-verify'`)
*   **Processus** :
    1.  L'utilisateur envoie Email + Code.
    2.  n8n récupère le hash stocké.
    3.  Hashage du code reçu et comparaison stricte.
    4.  **Nettoyage** : Si valide, le code OTP est supprimé de la base (Usage unique).
    5.  **Génération de Tokens** : Création d'un couple Access/Refresh tokens.

---

## 3. Gestion des Tokens (Session)

### 3.1. Access Token (JWT)
*   **Type** : JSON Web Token (JWT).
*   **Durée de vie** : **15 minutes** (Short-lived).
*   **Payload** : Email, User Labels (Groupes Google Contacts).
*   **Usage** : Authentification des requêtes chat (`Authorization: Bearer <token>`).

### 3.2. Refresh Token (Opaque)
*   **Type** : Chaîne aléatoire cryptographique (Hex string 40 bytes).
*   **Durée de vie** : **7 jours**.
*   **Stockage** : Hashé (SHA-256) dans la table `Active_Tokens`.
*   **Mécanisme** : **Rotation** (Reuse Detection). À chaque utilisation d'un Refresh Token, il est supprimé et remplacé par un nouveau, prolongeant la session de 7 jours.
*   **Sécurité Frontend** : Stocké dans `localStorage` (avec le risque XSS accepté pour ce niveau de criticité, mitigé par la validation des inputs).

### 3.3. Renouvellement Silencieux (Silent Refresh)
Le Frontend gère automatiquement l'expiration du JWT :
1.  Requête API -> Erreur 401.
2.  Frontend intercepte l'erreur.
3.  Appel `/refresh-token` avec le Refresh Token stocké.
4.  Si succès : Mise à jour des tokens et rejeu de la requête initiale.
5.  Si échec : Déconnexion forcée (Logout).

---

## 4. Couches de Protection

### 4.1. Rate Limiting (Anti-Spam/Bruteforce)
Implémenté via n8n Data Table `Rate_Limits`.

| Action | Limite | Fenêtre | Sanction |
| :--- | :--- | :--- | :--- |
| **Demande OTP** | 3 essais | 15 min | Blocage 30 min |
| **Vérification OTP** | 5 essais | 5 min | Blocage 30 min |

*Le blocage est persistant en base de données.*

### 4.2. Input Validation (Gatekeeper)
Un nœud Code dédié en entrée de flux vérifie strictement :
*   **Email** : Regex strict (requis pour auth).
*   **Action** : Whitelist (`auth-init`, `auth-verify`, `chat-message`, `refresh-token`).
*   **Formats** : Code OTP (4 chiffres), Types de données.
Tout input non conforme est rejeté immédiatement avec une erreur 400 propre.

---

## 5. Schéma de Données (n8n Tables)

### `OTP_Codes`
Stockage temporaire des codes d'authentification.
*   `email` (Primary)
*   `code` (String, SHA-256 Hash)
*   `created_at` (DateTime)

### `Active_Tokens`
Sessions longues durées actives.
*   `email` (String)
*   `token_hash` (String, SHA-256 Hash du Refresh Token)
*   `expires_at` (DateTime)
*   `revoked` (Boolean) - *Pour révocation manuelle future*

### `Rate_Limits`
Compteurs pour la limitation de débit.
*   `email` (Primary)
*   `action` (String) - 'auth-init' ou 'auth-verify'
*   `count` (Number)
*   `first_attempt_at` (DateTime)
*   `blocked_until` (DateTime)

### `Audit_Logs`
Historique des actions critiques.
*   `timestamp`
*   `email`
*   `action`
*   `status` (success/error)
*   `ip_address`
*   `details` (Message d'erreur nettoyé)

---

## 6. Gestion des Erreurs
Un système centralisé (**Normaliseur d'Erreur**) intercepte toutes les pannes (API OpenAI, Google, SMTP, JWT invalide) pour :
1.  Logger l'erreur technique brute (pour debugging).
2.  Présenter un message utilisateur propre ("Session expirée", "Service indisponible").
3.  Renvoyer le code HTTP approprié (400, 401, 503).
