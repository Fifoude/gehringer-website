---
description: Configuration du workflow d'ingestion RAG pour l'expérience professionnelle
---

# Workflow d'Ingestion RAG (n8n + Qdrant + Ollama)

## 📌 Objectif
Transformer le fichier "Table d'Expériences" (CSV) en vecteurs sémantiques stockés dans Qdrant pour permettre au chatbot de faire des recherches pertinentes.

## 🔗 Liens
- **Workflow ID Existant** : `SUnHfuWTje1RyreT` (Nom: "Embedding")
- **Collection Qdrant** : `experience_pro` (Déjà créée par le workflow existant)
- **Modèle Ollama** : `embeddinggemma:latest` (ou `nomic-embed-text` recommandé pour meilleure qualité)

---

## 🛠️ Étapes de Configuration (À implémenter dans n8n)

Nous allons faire évoluer le workflow actuel qui est basé sur un "Form Trigger" (Upload PDF) vers un workflow hybride capable d'ingérer le CSV structuré.

### 1. Modification du Trigger
- **Actuel** : `On form submission` (pour PDF).
- **Ajout** : Conserver ce trigger pour les PDF annexes, mais ajouter une branche pour le CSV.
  - *Note : Le CSV sera lu via un nœud "Read Binary File" ou uploadé via le même Form Trigger.*

### 2. Parsing du CSV (Nouveau Processing)
Au lieu de simplement "dumper" le binaire PDF, nous devons parser le CSV pour créer des métadonnées riches.

**Nœud : Spreadsheet File**
- **Action** : Read from file / Upload
- **Format** : CSV

**Nœud : Code (Javascript)**
Transformer chaque ligne CSV en un "Document" LangChain avec :
- `pageContent` : Une concaténation intelligente pour le LLM.
  > "Mission [Titre] chez [Client] ([Secteur]). Enjeu : [Contexte]. Actions : [Actions]. Résultats : [Resultats]."
- `metadata` : Tous les champs séparés pour filtrage futur.
  > `{ "sector": "Automobile", "role": "Manager", "year": "2022" }`

### 3. Gestion de la Collection Qdrant (Optimisation)
- **Vérification** : Le workflow actuel a des nœuds "Create Collection" et "Delete Collection".
- **Action** : Créer un workflow séparé "Maintenance Qdrant" pour créer/supprimer. Le workflow d'ingestion ne doit faire que l'INSERT/UPSERT.
  - *Évite de supprimer toute la mémoire à chaque exécution !*

### 4. Embedding (Ollama)
- **Modèle** : `embeddinggemma:latest` est utilisé actuellement.
- **Recommandation** : Si possible, switch vers `nomic-embed-text` (sur Ollama) qui est souvent meilleur pour le RAG (retrieval) que Gemma (généraliste).

---

## 📋 Structure du Workflow Cible

```mermaid
graph TD
    Trigger[Form Trigger / Manual] --> ReadFile[Read CSV File]
    ReadFile --> Parse[Code: Construct Documents]
    Parse --> Split[Text Splitter (Optional for CSV)]
    Split --> Embed[Embeddings Ollama]
    Embed --> Qdrant[Qdrant Vector Store (Upsert)]
```

## 📝 Actions Immédiates pour l'Utilisateur
1.  **Dans n8n** : Dupliquer le workflow `SUnHfuWTje1RyreT` pour créer une version "Ingestion CSV".
2.  **Configuration** : Remplacer le "Default Data Loader" par la logique parsing CSV décrite ci-dessus.
3.  **Test** : Uploader le fichier `data_ingestion_template.csv` (même avec 2 lignes) pour valider que les vecteurs se créent bien avec les métadonnées.
