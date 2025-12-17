# 📝 Cahier des Charges : Système RAG & Génération Documentaire

## 1. Objectifs du Projet
Mettre en place un système conversationnel intelligent capable de :
1.  **Valoriser l'expérience** : Répondre aux questions des recruteurs en se basant strictement sur les expériences réelles de Philippe Gehringer (RAG).
2.  **Analyser le besoin** : Comprendre une fiche de poste (JD - Job Description) uploadée par un utilisateur.
3.  **Convaincre** : Générer automatiquement des documents PDF ultra-personnalisés (CV ciblé ou Lettre de motivation/Offre de services) via Gotenberg.

---

## 2. Parcours Utilisateur (User Stories)

### Scénario A : La Conversation "Curieuse" (Mode Q&A)
*   **Acteur** : Un visiteur (recruteur potentiel).
*   **Action** : Pose une question (ex: *"Avez-vous de l'expérience dans l'industrie automobile et la RSE ?"*).
*   **Système** :
    1.  Interroge Qdrant (`experience_pro`) pour trouver les segments de CV pertinents.
    2.  Le LLM synthétise une réponse : *"Oui, j'ai mené telle mission chez X où j'ai réduit l'empreinte carbone de Y%..."*.
    3.  L'IA suggère des questions de suivi.

### Scénario B : L'Attaque "Offre de Service" (Mode Analyse de Doc)
*   **Acteur** : Un visiteur upload un fichier PDF/Docx (une fiche de poste).
*   **Action** : Le visiteur ne dit rien ou dit "Est-ce que ce poste vous correspond ?".
*   **Système** :
    1.  Analyse le document pour extraire les compétences clés et les enjeux.
    2.  Cherche dans Qdrant les expériences de Philippe qui "match" ces points spécifiques.
    3.  L'IA répond : *"Ce poste correspond à 85% à mon profil. Mes expériences chez A et B sont directement transposables. Voulez-vous que je génère une lettre de motivation ciblée pour ce poste ?"*.
*   **Action** : Le visiteur clique "Oui".
*   **Système** : Génère un PDF via Gotenberg et fournit le lien de téléchargement dans le chat.

---

## 3. Architecture Technique & Flux de Données

### 3.1. Stack Technique
*   **Frontend** : ChatWidget React (existant).
*   **Orchestrateur** : n8n.
*   **Mémoire (Vector DB)** : Qdrant (Collection `experience_pro`).
*   **Intelligence (LLM)** : Ollama (Modèle suggéré : `llama3` ou `mistral` pour le chat, `nomic-embed-text` pour les vecteurs).
*   **Rendu Document** : Gotenberg (API Docker).

### 3.2. Modélisation des Données (Qdrant)
La collection `experience_pro` ne doit pas contenir des blocs de texte bruts, mais des objets structurés pour un RAG efficace.

**Structure d'un vecteur (Payload) :**
*La qualité du RAG dépend de la structuration. Plutôt que de "lire" un CV PDF brut, nous allons utiliser un format structuré (CSV) qui sera bien plus puissant pour la recherche.*

```json
{
  "id": "uuid",
  "client_sector": "Automobile",
  "role": "Manager de transition",
  "context": "Fermeture de site...",
  "actions": "Négociation syndicale, plan social...",
  "results": "0 jour de grève, budget respecté...",
  "skills": ["RSE", "Gestion de crise", "Leadership"],
  "tools": ["Excel", "SAP"],
  "start_date": "2020-01",
  "end_date": "2020-12"
}
```

---

## 4. Spécifications Fonctionnelles n8n

Nous devons créer/affiner 3 workflows distincts.

### W1. Ingestion (Alimentation de la base)
*Ce workflow est déclenché manuellement par Philippe pour mettre à jour son "Double Numérique".*
1.  **Input** : Fichier JSON ou CSV contenant toutes les expériences passées + Compétences + Certifications.
2.  **Split** : Découpage par mission.
3.  **Embedding** : Ollama transforme le texte en vecteurs.
4.  **Upsert** : Envoi dans Qdrant (`experience_pro`).

### W2. Le Cerveau Conversationnel (RAG)
*Déclenché par un message texte.*
1.  **Embedding Query** : La question utilisateur est vectorisée.
2.  **Search** : Qdrant cherche les 3 à 5 "chunks" les plus proches.
3.  **System Prompt Construction** :
    > "Tu es l'assistant IA de Philippe Gehringer. Voici des extraits de son expérience : [CONTEXTE QDRANT]. Réponds à la question [QUESTION USER] en utilisant UNIQUEMENT ce contexte. Adopte un ton professionnel, expert mais accessible."
4.  **Generation** : Ollama génère la réponse.
5.  **Output** : Renvoi vers le ChatWidget.

### W3. Le Générateur de Documents (Analyst + Builder)
*Déclenché par un upload de fichier.*
1.  **Parse** : n8n lit le fichier (PDF/Word).
2.  **Extract** : LLM extrait : `Nom Entreprise`, `Besoin Principal`, `3 Compétences Clés requises`.
3.  **Matching** :
    *   Recherche Qdrant pour la Compétence A.
    *   Recherche Qdrant pour la Compétence B.
    *   Recherche Qdrant pour la Compétence C.
4.  **Drafting** : Le LLM rédige le corps de la lettre en connectant `Besoin` <-> `Expérience trouvée`.
5.  **Templating** : Injection du texte dans un template HTML (CSS Tailwind pour le style).
6.  **Rendering** : Envoi du HTML à Gotenberg -> Retourne un PDF.
7.  **Delivery** : Stockage temporaire + Envoi du lien au Chat.

---

## 5. Livrables Attendus & Tâches

### Phase 1 : Consolidation des Données (La base)
- [ ] Définir le schéma JSON exact des expériences.
- [ ] Créer le Workflow W1 (Ingestion) et charger l'historique de Philippe.

### Phase 2 : Le Chat RAG (Le dialogue)
- [ ] Configurer Qdrant pour la recherche sémantique.
- [ ] Optimiser le "System Prompt" pour éviter que l'IA ne parle à la 3ème personne (elle doit dire "Philippe a fait..." ou "J'ai fait..." selon votre choix).

### Phase 3 : L'Analyse & Génération (La "Magic Feature")
- [ ] Créer le Template HTML pour le CV/Lettre (Clean, Design Gehringer).
- [ ] Connecter Gotenberg dans n8n.
- [ ] Tester l'analyse de Fiche de Poste.

## 6. Décisions Techniques Validées (au 11/12/2025)

1.  **Identité IA** :
    *   **Persona** : "Je suis l'IA de Philippe".
    *   **Ton** : L'IA assume sa nature artificielle mais parle avec l'autorité déléguée par Philippe. Elle utilise le "Nous" quand elle parle du binôme Philippe+IA, et "Philippe" quand elle parle de l'humain.

2.  **Source de Données (Ingestion)** :
    *   **Approche Hybride** :
        *   **Source Primaire (Haute Qualité)** : Un fichier structuré (CSV/Excel) détaillé ("Table d'Expériences") que Philippe remplira. C'est la source de vérité pour le RAG.
        *   **Source Secondaire** : Les PDF existants (CVs) serviront d'appoint ou de pièces jointes, mais le RAG tapera dans la donnée structurée pour éviter les hallucinations de mise en page.

3.  **Stockage & Rétention Documents** :
    *   **Archivage** : Les PDF générés (CVs ciblés, Lettres) sont stockés localement sur le serveur.
    *   **Feedback Loop** : Une trace de chaque génération est gardée (dans Qdrant ou une table SQL) pour que l'IA puisse dire "J'ai déjà généré un CV pour ce type de poste la semaine dernière".

4.  **Format de Sortie** :
    *   Stockage : Volume Docker partagé ou dossier local `generated-docs/`.
    *   Accès : Lien de téléchargement unique fourni dans le Chat.

## 7. Architecture Implémentée (Mise à jour 12/12/2025)

Cette section documente les spécificités techniques critiques mises en place lors de l'implémentation finale des workflows.

### 7.1. Workflow Unifié "RAG Chat & PDF Generator"

Ce workflow combine la conversation, l'analyse de fichiers et la génération de documents.

*   **Détection d'Entrée (Robustesse Input)** :
    *   Les entrées fichiers peuvent arriver sous deux formes selon la source (Chat Widget vs Formulaire Web/MCP) : soit dans l'objet `binary` standard, soit dans `json.files`.
    *   **Solution** : Un nœud **"Check Input"** normalise cette entrée.
    *   *Code Clé* :
        ```javascript
        const hasBinary = items[0].binary && Object.keys(items[0].binary).length > 0;
        const hasJsonFile = items[0].json.files && items[0].json.files.length > 0;
        // ... Logique de fusion
        ```

*   **Gestion des Fichiers PDF (Analyse)** :
    *   L'Agent LangChain ne lit pas nativement les binaires n8n.
    *   **Stratégie** : Extraction du texte en amont (via `pdf-parse` ou extraction native) et injection dans le prompt utilisateur (`chatInput`).
    *   L'IA reçoit donc : "Voici le contenu du fichier joint : [TEXTE DU PDF]... Analyse ceci."

*   **Génération PDF "Invisible"** :
    *   L'Agent a pour instruction de générer du code HTML entouré de balises `<GENERATE_PDF>...</GENERATE_PDF>` s'il décide de créer un document.
    *   Un routeur JavaScript (`Detect PDF Request`) scanne la réponse.
    *   Si balise trouvée : Extraction du HTML -> Envoi à Gotenberg -> Sauvegarde du PDF.
    *   Si pas de balise : Réponse textuelle directe à l'utilisateur.

### 7.2. Workflow "Backend Chat API" (Intégration Astro)

Ce workflow gère les requêtes API provenants du site web (Chat Widget React).

*   **Chaîne Audio (Whisper STT)** :
    *   **Problème** : Les données binaires audio (`audio/webm`) étaient perdues lors de la traversée des nœuds de logique (JWT Auth, Router).
    *   **Solution** : Injection chirurgicale juste avant le nœud Whisper.
        ```javascript
        // Récupération directe depuis la source
        const binaryData = $('Webhook (Entrée Unique)').first().binary;
        return [{ json: items[0].json, binary: binaryData }];
        ```
    *   **Configuration Whisper** : Champ d'entrée binaire défini sur `audio` (au lieu de `data` par défaut) pour correspondre au FormData du frontend.

*   **Parsing de la Réponse IA** :
    *   Le nœud **OpenAI LangChain** retourne une structure JSON complexe et imbriquée (`output.content[0].text`) qui n'est pas toujours exposée clairement dans l'interface n8n ("Run Once for All Items" vs "Each Item").
    *   **Solution** : Un nœud **Code** de nettoyage final assure une sortie stable vers le Frontend.
        ```javascript
        /* Extraction robuste de la réponse texte */
        const content = item.json.output[0].content;
        const text = content ? content[0].text : "Pas de réponse";
        return { json: { text } };
        ```
    *   Le nœud "Respond to Webhook" renvoie alors un JSON simple : `{ "response": "{{ $json.text }}" }`.
