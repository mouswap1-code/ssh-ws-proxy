# SSH WebSocket Proxy pour Cloud Run

Proxy SSH compatible WebSocket pour Google Cloud Run.

## Configuration

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `DHOST` | `127.0.0.1` | IP ou domaine du VPS cible |
| `DPORT` | `22` | Port SSH du VPS |
| `PORT` | `8080` | Port interne (ne pas modifier) |

## Déploiement

```bash
gcloud run deploy ssh-proxy \
  --source . \
  --platform managed \
  --region europe-west2 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --set-env-vars "DHOST=165.227.234.179,DPORT=22"
