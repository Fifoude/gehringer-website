Pour un n8n **self‑hosted non‑Enterprise** (WSL2 + Docker + Compose), la méthode documentée pour sauvegarder/versionner tes workflows dans GitHub est :

## 1. Exporter les workflows avec la CLI n8n

Depuis ton hôte, tu peux lancer la CLI **dans le conteneur** avec `docker exec` (recommandé dans les réponses officielles) :

```bash
docker exec -it -u node n8n n8n export:workflow --backup --output=/home/node/workflows-backup
```

- `--backup` = `--all --pretty --separate` → un fichier JSON par workflow, lisible et idéal pour Git. [[Export CLI](https://docs.n8n.io/hosting/cli-commands/#export-workflows-and-credentials)]
- Le chemin `/home/node/workflows-backup` est **dans le conteneur**.

Pour récupérer ces fichiers sur l’hôte, monte un volume dans ton `docker-compose.yml`, par ex. :

```yaml
services:
  n8n:
    ...
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./workflows_backup:/home/node/workflows-backup
```

Ainsi, tout ce qui est écrit dans `/home/node/workflows-backup` dans le conteneur apparaîtra dans `./workflows_backup` sur ta machine WSL2.

Cette approche (exporter les workflows en JSON puis les versionner) est exactement ce qui est recommandé pour faire du versioning Git sans Enterprise. [[Controlling workflows](https://community.n8n.io/t/229592)]

## 2. Mettre ces fichiers sous Git/GitHub

Sur ta machine (dans WSL2), dans le dossier monté :

```bash
cd ./workflows_backup
git init
git add .
git commit -m "Export initial des workflows n8n"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Ensuite, pour mettre à jour :

```bash
docker exec -it -u node n8n n8n export:workflow --backup --output=/home/node/workflows-backup
cd ./workflows_backup
git add .
git commit -m "Mise à jour workflows"
git push
```

## 3. Alternative ponctuelle via l’UI

Tu peux aussi exporter un workflow à la fois depuis l’éditeur : menu “⋯” → **Download** (JSON), puis mettre ces fichiers dans ton repo Git manuellement. [[Export/import UI](https://docs.n8n.io/workflows/export-import/#export-and-import-workflows)]

---

Les connaissances fournies ne décrivent pas d’autre mécanisme automatique “GitHub direct” pour l’édition non‑Enterprise : la voie officielle reste **export JSON + Git**.