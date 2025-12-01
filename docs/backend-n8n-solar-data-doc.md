# 📊 Documentation des Données Solaires

## 🧠 Guide d’utilisation pour l’IA

- Ce document décrit **les données solaires** et les sources (n8n Data Tables, Google Sheets).
- À utiliser pour :
  - comprendre les champs disponibles (`energy_hourly`, `solar_data`, historique Sheets)
  - savoir quelles métriques afficher (autosuffisance, autoconsommation, etc.)
  - construire des requêtes d’API (via Webhooks n8n recommandés).
- Ne jamais inventer de colonnes : utiliser uniquement celles décrites ici.


## 🎯 Objectif de ce document

Ce document décrit les sources de données disponibles pour construire des visualisations (courbes, graphiques) de production et consommation solaire. Il est destiné aux IA/développeurs qui doivent créer des pages web d'analyse des données photovoltaïques.

---

## 📁 Sources de Données Disponibles

### 1️⃣ Data Table: `energy_hourly`
**ID n8n**: `iTqe8WKnm0cfsE1B`

#### 📝 Description
Table contenant les données **horaires** de production/consommation/importé/injecté photovoltaïque avec prévisions. Mise à jour automatiquement toutes les heures.

#### 🔄 Mise à jour
- **Fréquence**: Toutes les heures (24x/jour)
- **Workflow**: Workflow B - Données Temps Réel
- **Rétention**: 48 heures (purge automatique)

#### 📊 Structure de la table

| Colonne | Type | Description | Unité | Exemple |
|---------|------|-------------|-------|---------|
| `timestamp` | DateTime | Horodatage de l'enregistrement (timezone Europe/Paris) | ISO 8601 | `2025-11-20T14:30:00` |
| `date` | String | Date au format YYYY-MM-DD | - | `2025-11-20` |
| `hour` | Number | Heure de la journée (0-23) | - | `14` |
| `produced_kwh` | Number | Production solaire cumulée depuis minuit | kWh | `8.45` |
| `consumed_kwh` | Number | Consommation électrique cumulée depuis minuit | kWh | `12.30` |
| `imported_kwh` | Number | Électricité importée du réseau cumulée depuis minuit | kWh | `5.20` |
| `exported_kwh` | Number | Électricité injectée vers le réseau cumulée depuis minuit | kWh | `1.35` |
| `autoconsumed_kwh` | Number | Autoconsommation cumulée (produite - injectée) | kWh | `7.10` |
| `autosufficiency_pct` | Number | Taux d'autosuffisance (autoconso / consommation × 100) | % | `57.72` |
| `autoconsumption_pct` | Number | Taux d'autoconsommation (autoconso / production × 100) | % | `84.02` |
| `forecast_day_kwh` | Number | Prévision de production totale pour la journée | kWh | `12.50` |
| `forecast_hour_cumul_kwh` | Number | Prévision de production cumulée jusqu'à l'heure actuelle | kWh | `8.30` |

#### ⚠️ Points importants

1. **Données cumulatives**: Les valeurs `*_kwh` sont **cumulées depuis minuit** (00h00)
   - À 14h, `produced_kwh = 8.45` signifie que 8.45 kWh ont été produits entre 00h et 14h
   - À 15h, `produced_kwh = 9.20` signifie que 9.20 kWh ont été produits entre 00h et 15h

2. **Prévisions variables**: `forecast_day_kwh` peut **varier d'une heure à l'autre**
   - L'API Forecast.Solar met à jour ses prévisions toutes les heures
   - Pour comparer production réelle vs prévision initiale, utiliser la **première ligne du jour**

3. **Rétention 48h**: Seules les données des 48 dernières heures sont disponibles
   - Pour historique > 48h, utiliser Google Sheets (voir section 3)

4. **Timezone**: Toutes les timestamps sont en **Europe/Paris** (UTC+1 hiver, UTC+2 été)

#### 📈 Cas d'usage pour visualisations

**1. Courbe de production du jour en cours**
```sql
SELECT hour, produced_kwh 
FROM energy_hourly 
WHERE date = CURRENT_DATE 
ORDER BY hour
```
→ Graphique linéaire montrant la production cumulée depuis minuit

**2. Comparaison production réelle vs prévisions**
```sql
SELECT hour, produced_kwh, forecast_hour_cumul_kwh 
FROM energy_hourly 
WHERE date = CURRENT_DATE 
ORDER BY hour
```
→ Deux courbes superposées (réel vs prévision)

**3. Bilan énergétique journalier**
```sql
SELECT hour, produced_kwh, consumed_kwh, imported_kwh, exported_kwh 
FROM energy_hourly 
WHERE date = CURRENT_DATE 
ORDER BY hour
```
→ Graphique multi-courbes pour analyser les flux énergétiques

**4. Évolution des taux d'autoconsommation**
```sql
SELECT hour, autosufficiency_pct, autoconsumption_pct 
FROM energy_hourly 
WHERE date = CURRENT_DATE 
ORDER BY hour
```
→ Courbes en pourcentage

---

### 2️⃣ Data Table: `solar_data`
**ID n8n**: `r7fhudUyDIqwqXUC`

#### 📝 Description
Table contenant les données **quotidiennes** de lever/coucher du soleil et crépuscules. Mise à jour une fois par jour.

#### 🔄 Mise à jour
- **Timezone CRON**: Exécution à 01h00, heure de Paris (⚠️ attention de bien régler le timezone dans le Workflow setting)
- **Workflow**: Workflow C - Données astronomique
- **Rétention**: 48 heures (purge automatique)

#### 📊 Structure de la table

| Colonne | Type | Description | Format | Exemple |
|---------|------|-------------|--------|---------|
| `timestamp` | DateTime | Horodatage de l'enregistrement | ISO 8601 | `2025-11-20T01:00:00` |
| `date` | String | Date concernée | YYYY-MM-DD | `2025-11-20` |
| `sunrise` | String | Heure du lever du soleil | HH:MM:SS | `08:15:42` |
| `sunset` | String | Heure du coucher du soleil | HH:MM:SS | `17:23:18` |
| `solar_noon` | String | Midi solaire (soleil au zénith) | HH:MM:SS | `12:49:30` |
| `day_length` | String | Durée du jour | HH:MM:SS | `09:07:36` |
| `civil_twilight_begin` | String | Début crépuscule civil | HH:MM:SS | `07:42:15` |
| `civil_twilight_end` | String | Fin crépuscule civil | HH:MM:SS | `17:56:45` |
| `nautical_twilight_begin` | String | Début crépuscule nautique | HH:MM:SS | `07:04:30` |
| `nautical_twilight_end` | String | Fin crépuscule nautique | HH:MM:SS | `18:34:30` |
| `astronomical_twilight_begin` | String | Début crépuscule astronomique | HH:MM:SS | `06:27:12` |
| `astronomical_twilight_end` | String | Fin crépuscule astronomique | HH:MM:SS | `19:11:48` |

#### ⚠️ Points importants

1. **Timezone**: Toutes les heures sont en **Europe/Paris** (déjà converties depuis UTC)
2. **Format heures**: String `HH:MM:SS` (à parser si besoin de calculs)
3. **Une entrée/jour**: Données disponibles uniquement pour J et J-1 (48h rétention)
4. **Source**: API sunrise-sunset.org

#### 📈 Cas d'usage pour visualisations

**1. Afficher heures de lever/coucher**
```sql
SELECT date, sunrise, sunset 
FROM solar_data 
WHERE date = CURRENT_DATE
```
→ Affichage textuel ou marqueurs sur graphique

**2. Visualiser durée du jour**
```sql
SELECT date, day_length 
FROM solar_data 
ORDER BY date
```
→ Graphique montrant l'évolution de la durée du jour

**3. Overlay sur graphique de production**
- Utiliser `sunrise` et `sunset` pour marquer début/fin de production théorique
- Afficher zones colorées pour les différents crépuscules

---

### 3️⃣ Google Sheets: "APsystems - Historique Quotidien"
**ID Google Sheets**: `1MHFGECBWHFgl0VNcXwIdnTyx9-OoWmHrHdglP7LurJ0`  
**Feuille**: `Feuille 1` (gid=0)

#### 📝 Description
Feuille de calcul contenant l'**historique quotidien** (un enregistrement par jour) comparant production réelle vs prévisions. Données conservées indéfiniment.

#### 🔄 Mise à jour
- **Fréquence**: 1x/jour (à 00h30, heure de Paris - voir note timezone)
- **Workflow**: Workflow A - Historique Quotidien
- **Rétention**: Illimitée (historique complet)

#### 📊 Structure de la feuille

| Colonne | Type | Description | Unité | Exemple |
|---------|------|-------------|-------|---------|
| `Date` | String | Date au format YYYY-MM-DD | - | `2025-11-19` |
| `Production Réelle (kWh)` | Number | Production solaire totale du jour | kWh | `10.25` |
| `Prévision (kWh)` | Number | Prévision initiale (faite à 01h du jour) | kWh | `12.50` |
| `Écart (kWh)` | Number | Différence réel - prévision | kWh | `-2.25` |
| `Écart (%)` | Number | Écart en pourcentage ((écart / prévision) × 100) | % | `-18.00` |
| `Consommation (kWh)` | Number | Consommation électrique totale du jour | kWh | `18.30` |
| `Importé (kWh)` | Number | Électricité importée du réseau | kWh | `9.40` |
| `Exporté (kWh)` | Number | Électricité exportée vers le réseau | kWh | `1.35` |
| `Autoconsommation (%)` | Number | Taux d'autoconsommation | % | `86.83` |
| `Autosuffisance (%)` | Number | Taux d'autosuffisance | % | `48.63` |
| `Charged (kWh)` | Number | Charge des batteries | kWh | `8.63` |
| `Discharged (kWh)` | Number | Décharge des batteries | kWh | `4.47` |

#### ⚠️ Points importants

1. **Données journalières**: Une ligne = bilan de toute une journée (00h00 → 23h59)
2. **Prévision initiale**: La colonne "Prévision (kWh)" contient la **première prévision du jour** (faite à ~01h)
   - Important car les prévisions changent toutes les heures dans `energy_hourly`
3. **Accès API**: Utiliser Google Sheets API v4 ou export CSV
4. **Timezone CRON**: Exécution à 00h30 UTC (⚠️ attention de bien régler le timezone dans le Workflow setting)
5. **APStorage**: le système APStorage n'est interrogeable pae l'OPENAPI de APSystems. Les informations de Charged et Discharged sont saisies manuellement

#### 📈 Cas d'usage pour visualisations

**1. Historique de production**
```javascript
// Données colonnes: Date, Production Réelle (kWh)
SELECT Date, `Production Réelle (kWh)` 
FROM sheet 
ORDER BY Date DESC 
LIMIT 30
```
→ Graphique linéaire des 30 derniers jours

**2. Précision des prévisions**
```javascript
// Données colonnes: Date, Écart (%)
SELECT Date, `Écart (%)` 
FROM sheet 
ORDER BY Date DESC 
LIMIT 30
```
→ Graphique en barres montrant les écarts (positifs = meilleure prod que prévu)

**3. Analyse autoconsommation**
```javascript
// Colonnes: Date, Autoconsommation (%), Autosuffisance (%)
SELECT Date, `Autoconsommation (%)`, `Autosuffisance (%)` 
FROM sheet 
ORDER BY Date DESC 
LIMIT 30
```
→ Deux courbes pour analyser l'évolution des taux

**4. Bilan mensuel**
```javascript
// Agrégation par mois
SELECT 
  SUBSTR(Date, 1, 7) as Mois,
  SUM(`Production Réelle (kWh)`) as Total_Production,
  AVG(`Autoconsommation (%)`) as Moyenne_Autoconso
FROM sheet
GROUP BY Mois
ORDER BY Mois DESC
```
→ Graphiques mensuels agrégés

---

## 🔌 Accès aux Données

### Option 1: API Webhooks n8n (Nouveau & Recommandé)

#### Configuration
- **Base URL**: `https://n8n.gehringer.fr/webhook`
- **Authentification**: Aucune (Webhooks publics)
- **Méthode**: GET

#### Endpoints Disponibles
1. **Données Solaires (Temps Réel)**
   - **URL**: `/solar-data`
   - **Paramètres**: `?date=YYYY-MM-DD` (optionnel, défaut = aujourd'hui)
   - **Retour**: JSON (lignes de `energy_hourly`)

2. **Données Astronomiques**
   - **URL**: `/astro-data`
   - **Paramètres**: `?date=YYYY-MM-DD` (optionnel)
   - **Retour**: JSON (lignes de `solar_data`)

3. **Historique Complet**
   - **URL**: `/solar-history`
   - **Retour**: JSON (contenu du Google Sheet)

#### Avantages
- ✅ Accès direct et rapide
- ✅ Pas de clé API complexe à gérer côté client
- ✅ Format JSON standardisé

---

### Option 2: API n8n Data Tables (Accès bas niveau)

#### Configuration
- **Base URL**: `https://n8n.gehringer.fr`
- **Authentification**: API Key n8n
- **Méthode**: Utiliser n8n REST API ou SDK

#### Exemple de requête (pseudo-code)
```javascript
// Récupérer données energy_hourly du jour
GET /api/v1/datatables/iTqe8WKnm0cfsE1B/rows
  ?filter[date][eq]=2025-11-20
  &sort=hour:asc
  
// Récupérer données solar_data
GET /api/v1/datatables/r7fhudUyDIqwqXUC/rows
  ?filter[date][eq]=2025-11-20
```

#### Avantages
- ✅ Données en temps réel (actualisées toutes les heures)
- ✅ Filtrage et tri côté serveur
- ✅ Format JSON structuré

#### Limitations
- ⚠️ Historique limité à 48h
- ⚠️ Nécessite authentification n8n

---

### Option 3: Google Sheets API (Pour historique long terme)

#### Configuration
- **Spreadsheet ID**: `1MHFGECBWHFgl0VNcXwIdnTyx9-OoWmHrHdglP7LurJ0`
- **Sheet Name**: `Feuille 1`
- **Authentification**: Google OAuth2 ou API Key

#### Exemple avec Google Sheets API v4
```javascript
// JavaScript avec gapi
gapi.client.sheets.spreadsheets.values.get({
  spreadsheetId: '1MHFGECBWHFgl0VNcXwIdnTyx9-OoWmHrHdglP7LurJ0',
  range: 'Feuille 1!A:J',
}).then(response => {
  const rows = response.result.values;
  // Traiter les données
});
```

#### Avantages
- ✅ Historique complet (tous les jours depuis le début)
- ✅ Export CSV facile
- ✅ Visualisation directe dans Google Sheets

#### Limitations
- ⚠️ Mise à jour 1x/jour seulement
- ⚠️ Nécessite authentification Google

---

### Option 4: Export CSV via Netlify Functions (Recommandé pour pages statiques)

Créer une Netlify Function qui interroge n8n et retourne du JSON/CSV pour le frontend.

#### Exemple de fonction
```javascript
// netlify/functions/solar-data.js
exports.handler = async (event) => {
  const { source, date } = event.queryStringParameters;
  
  if (source === 'energy_hourly') {
    // Interroger n8n Data Table energy_hourly
    const data = await fetch(`${N8N_URL}/datatables/iTqe8WKnm0cfsE1B/rows`, {
      headers: { 'Authorization': `Bearer ${N8N_API_KEY}` }
    });
    return {
      statusCode: 200,
      body: JSON.stringify(await data.json())
    };
  }
  
  if (source === 'google_sheets') {
    // Interroger Google Sheets API
    // ...
  }
};
```

#### Avantages
- ✅ Pas d'exposition des clés API côté client
- ✅ Compatibilité avec sites statiques (Astro)
- ✅ Cache possible côté CDN

---

## 📊 Exemples de Visualisations Recommandées

### 1. Dashboard Temps Réel (aujourd'hui)
**Source**: `energy_hourly` (dernières 24h)

```
┌─────────────────────────────────────┐
│  Production Aujourd'hui             │
│  ▂▃▅▇█▇▅▃▂  12.5 kWh / 13.2 kWh    │
│  (réel / prévu)                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Autoconsommation                   │
│  ████████░░  82%                   │
└─────────────────────────────────────┘
```

**Graphiques**:
- Courbe de production cumulée (produced_kwh)
- Overlay prévision (forecast_hour_cumul_kwh)
- Marqueurs sunrise/sunset depuis `solar_data`

---

### 2. Comparaison Hier vs Aujourd'hui
**Sources**: `energy_hourly` (J-1 et J)

```
  Production (kWh)
  15 │                    
     │         ╱╲         
  10 │       ╱    ╲       ▲ Aujourd'hui
     │     ╱        ╲     ● Hier
   5 │   ╱            ╲   
     │ ╱                ╲
   0 └─────────────────────
     6h  9h  12h  15h  18h
```

---

### 3. Historique 30 jours
**Source**: Google Sheets (colonnes Date, Production Réelle)

```
  Production Quotidienne (kWh)
  15 │ ▆                   
     │ █ ▅ ▇               
  10 │ █ █ █ ▄ ▃           
     │ █ █ █ █ █ ▂ ▅ ▆     
   5 │ █ █ █ █ █ █ █ █ ▃   
     └─────────────────────
     Oct 20  Nov 1  Nov 20
```

---

### 4. Analyse Prévisions
**Source**: Google Sheets (colonnes Date, Écart %)

```
  Précision Prévisions (%)
  +50│         ▲           
     │       ▲ │           
    0├───────┼─────────── Prévision parfaite
     │     ▼   ▼           
  -50│   ▼                 
     └─────────────────────
     ▲ Meilleure prod que prévu
     ▼ Moins bonne que prévu
```

---

## 🛠️ Formules et Calculs Utiles

### Calcul de production horaire (non cumulative)
```javascript
// Pour obtenir la production de chaque heure (pas cumul)
const hourlyProduction = [];
for (let i = 1; i < data.length; i++) {
  hourlyProduction.push({
    hour: data[i].hour,
    production: data[i].produced_kwh - data[i-1].produced_kwh
  });
}
```

### Calcul du taux d'autosuffisance
```javascript
// Formule déjà dans les données, mais pour référence:
autosufficiency_pct = (autoconsumed_kwh / consumed_kwh) × 100
```

### Calcul du taux d'autoconsommation
```javascript
autoconsumption_pct = (autoconsumed_kwh / produced_kwh) × 100
```

### Conversion durée du jour en minutes
```javascript
// solar_data.day_length = "09:07:36"
function durationToMinutes(duration) {
  const [hours, minutes, seconds] = duration.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
}
```

---

## ⚡ Performance et Optimisation

### Recommandations

1. **Cache côté client**: Les données `energy_hourly` changent toutes les heures
   - Mettre en cache pendant 5-10 minutes
   - Afficher timestamp de dernière mise à jour

2. **Lazy loading**: Charger d'abord les données du jour, puis l'historique

3. **Pagination**: Pour Google Sheets, ne charger que les N derniers jours nécessaires

4. **Agrégation**: Calculer moyennes/totaux côté serveur si possible

---

## 🔔 Gestion des Données Manquantes

### Scénarios possibles

1. **Pas de données `energy_hourly` pour une heure**
   - Normal si workflow n8n en erreur
   - Interpoler ou afficher trou dans le graphique

2. **Pas de données `solar_data` pour aujourd'hui**
   - Normal avant 01h du matin
   - Utiliser données de J-1 ou masquer

3. **Trou dans Google Sheets**
   - Vérifier exécution du Workflow A
   - Possiblement dû au problème de timezone CRON (corrigé)

---

## 📅 Timezone et Horaires

### ⚠️ Important: Tous les horaires sont en **Europe/Paris**

- **Hiver** (fin octobre → fin mars): UTC+1
- **Été** (fin mars → fin octobre): UTC+2

### Workflow A - Exécution
- **Configuré pour**: 00h30 Paris (hiver et été)
- **Dates de changement d'heure en 2025**:
  - 30 mars 2025 → heure d'été
  - 26 octobre 2025 → heure d'hiver

---

## 📖 Glossaire

| Terme | Définition |
|-------|------------|
| **Production** | Électricité générée par les panneaux solaires |
| **Consommation** | Électricité utilisée par la maison |
| **Importé** | Électricité achetée au réseau |
| **Exporté** | Électricité injectée/vendue au réseau |
| **Autoconsommation** | Production consommée directement (prod - export) |
| **Taux autoconsommation** | % de la production autoconsommée |
| **Taux autosuffisance** | % de la consommation couverte par production |
| **Prévision cumulée** | Production attendue depuis minuit jusqu'à l'heure H |
| **Prévision jour** | Production totale attendue pour toute la journée |

---

## 🔗 Liens Utiles

### APIs Externes Utilisées
- **APsystems API**: Production/consommation réelle
  - Documentation: [APsystems OpenAPI User Manual](voir PDF)
  - Base URL: `https://api.apsystemsema.com:9282`
  
- **Forecast.Solar**: Prévisions production solaire
  - Documentation: https://doc.forecast.solar
  - Base URL: `https://api.forecast.solar`
  
- **Sunrise-Sunset.org**: Heures lever/coucher soleil
  - Documentation: https://sunrise-sunset.org/api
  - Base URL: `https://api.sunrise-sunset.org`

### Workflows n8n

#### Workflows Principaux (Orchestrateurs)
- **Workflow A**: Historique Quotidien (ID: `9V02WzToapyCQzhz`)
- **Workflow B**: Données Temps Réel (ID: `fbNRoWx41rt2EdOW`)
- **Workflow C**: Données astronomique (ID: `J1o613yJmGZxSSzR`)

#### Sub-Workflows (Modules de données)
- **[SUB] APsystems - Données Horaires**: Récupération production jour J
- **[SUB] APsystems - Données Quotidiennes**: Récupération historique J-1
- **[SUB] Forecast.Solar - Prévision Heure**: Prévisions horaires
- **[SUB] Forecast.Solar - Prévision Jour**: Prévision journalière
- **[SUB] Sunrise-Sunset - Données Solaires**: Données astronomiques

#### API Workflows (Webhooks)
- **API Solar** (ID: `j0u1aEGtWlvhPuwf`): Endpoint `solar-data`
- **API Astro** (ID: `6IIswAnmueTOgoTb`): Endpoint `astro-data`
- **API History** (ID: `0Lvs0DixSnBVXCmp`): Endpoint `solar-history`

---

## 📝 Changelog

| Date | Version | Modifications |
|------|---------|---------------|
| 2025-11-20 | 1.0 | Création du document initial |
| 2025-11-20 | 1.1 | Ajout correction problème purge Data Tables |
| 2025-11-20 | 1.2 | Ajout correction timezone CRON Workflow A |
| 2025-11-21 | 1.3 | Restructuration avec ajouts Workflow C |
| 2025-11-29 | 1.4 | Ajout des APIs Webhooks et modularisation (SUB workflows) |

---

## 👤 Contact

Pour questions sur les données ou accès aux APIs:
- **Email**: web.contact@gehringer.fr
- **Localisation Installation**: Suresnes, France (48.8782753, 2.2268011)
- **Puissance Installée**: 3.36 kWc
- **Inclinaison**: 5° / Azimut: 44° (Sud-Est)

---

**Document généré pour**: Exploitation par IA/développeurs
**Dernière mise à jour**: 29 novembre 2025
**Version**: 1.4