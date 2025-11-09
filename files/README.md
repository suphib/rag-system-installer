# 🚀 RAG System Setup - Complete Guide

## 📋 Übersicht

Dieses Setup installiert ein komplettes RAG (Retrieval Augmented Generation) System auf einem EPYC 03 Server (24fire.de):

- **Ollama** - LLM Runtime (Llama 3.1 8B)
- **Qdrant** - Vektordatenbank
- **TypeScript API** - REST API für PDF Upload & Chat
- **Debian 12** - Betriebssystem

## 💰 Kosten

- Server: **22,99 €/Monat** (EPYC 03)
- Keine weiteren Cloud-Kosten!
- 100% On-Premise

## ⚙️ Server Specs

```
CPU:     4 Kerne (AMD EPYC 9355P)
RAM:     24 GB DDR5 ECC
Storage: 150 GB NVMe SSD
Network: 1 Gbit/s
```

## 🛠️ Installation

### Phase 1: Server Setup (15 min)

```bash
# 1. Mit Server verbinden
ssh root@DEINE-SERVER-IP

# 2. Setup Scripts herunterladen
cd /root
git clone https://github.com/YOUR-REPO/rag-setup.git
cd rag-setup

# ODER: Scripts einzeln erstellen (siehe unten)

# 3. Scripts ausführbar machen
chmod +x *.sh

# 4. Initial Setup (System, Docker, Firewall)
./01-initial-setup.sh
```

**Was passiert:**
- System Updates
- Docker Installation
- Firewall (UFW) Konfiguration
- Fail2ban (SSH Schutz)
- Ollama Installation
- 8GB Swap File

### Phase 2: RAG System (20 min)

```bash
# Qdrant starten & Llama Model herunterladen
./02-install-rag.sh
```

**Was passiert:**
- Qdrant Docker Container starten
- Llama 3.1 8B herunterladen (~4.7 GB)
- Collection in Qdrant erstellen
- System testen

**⏱️ Dauer:** ~10-15 Minuten (Model Download)

### Phase 3: API Setup (10 min)

```bash
# Node.js & Dependencies installieren
cd /opt/rag-system/api
/root/rag-setup/03-install-api.sh
```

**Was passiert:**
- Node.js 20 Installation
- PM2 Process Manager
- NPM Dependencies (~200 Packages)

### Phase 4: API Code erstellen (5 min)

```bash
# TypeScript API Code generieren & builden
./04-create-api-code.sh
```

**Was passiert:**
- TypeScript Source Code erstellen
- Build durchführen
- PM2 Config erstellen

### Phase 5: API starten

```bash
cd /opt/rag-system/api

# API mit PM2 starten
pm2 start ecosystem.config.js

# PM2 bei Server-Neustart automatisch starten
pm2 save
pm2 startup

# Logs anschauen
pm2 logs rag-api
```

### Phase 6: System testen

```bash
# Test Script ausführen
cd /root/rag-setup
./05-test-system.sh
```

## 🎯 API Endpoints

### Base URL
```
http://DEINE-SERVER-IP:3000
```

### Endpoints

#### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 2. PDF Upload & Indexieren
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/vertrag.pdf"
```

Response:
```json
{
  "success": true,
  "filename": "vertrag.pdf",
  "chunks": 12,
  "message": "Successfully indexed 12 chunks"
}
```

#### 3. Chat / Fragen stellen
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Welche Kündigungsfristen haben unsere Verträge?",
    "maxResults": 5
  }'
```

Response:
```json
{
  "answer": "Basierend auf den Verträgen...",
  "sources": ["vertrag1.pdf", "vertrag2.pdf"],
  "processingTime": 3247
}
```

#### 4. Collection Stats
```bash
curl http://localhost:3000/api/stats
```

## 🧪 Testing

### Test 1: Ollama
```bash
ollama run llama3.1:8b "Hallo, funktionierst du?"
```

### Test 2: Qdrant
```bash
curl http://localhost:6333/collections
```

### Test 3: API
```bash
curl http://localhost:3000/api/health
```

### Test 4: Complete System
```bash
./05-test-system.sh
```

## 📊 Performance

### Llama 3.1 8B auf EPYC 03:

- **Einfache Frage:** ~2-4 Sekunden
- **Komplexe Analyse:** ~5-10 Sekunden
- **Tokens/Sekunde:** ~5-8 (CPU only)
- **Parallele User:** 1-2

## 🔧 Management

### PM2 Commands
```bash
# Status anzeigen
pm2 status

# Logs anschauen
pm2 logs rag-api

# API neustarten
pm2 restart rag-api

# API stoppen
pm2 stop rag-api

# Monitoring
pm2 monit
```

### Docker Commands
```bash
# Qdrant Status
docker ps

# Qdrant Logs
docker logs qdrant

# Qdrant neustarten
docker restart qdrant

# Qdrant stoppen/starten
docker-compose -f /opt/rag-system/docker-compose.yml stop
docker-compose -f /opt/rag-system/docker-compose.yml start
```

### Ollama Commands
```bash
# Models anzeigen
ollama list

# Neues Model laden
ollama pull llama3.1:13b

# Model testen
ollama run llama3.1:8b "Test"

# Service Status
systemctl status ollama
```

## 📁 Verzeichnisstruktur

```
/opt/rag-system/
├── docker-compose.yml          # Qdrant Configuration
├── qdrant/                     # Qdrant Data
│   └── storage/
├── documents/                  # Uploaded PDFs (optional)
├── logs/                       # API Logs
│   ├── out.log
│   ├── err.log
│   └── combined.log
└── api/                        # API Code
    ├── src/
    │   ├── index.ts           # Main App
    │   ├── routes/            # API Routes
    │   ├── services/          # Business Logic
    │   │   ├── ollama.service.ts
    │   │   ├── qdrant.service.ts
    │   │   └── rag.service.ts
    │   └── types/             # TypeScript Types
    ├── dist/                   # Compiled JS
    ├── package.json
    ├── tsconfig.json
    └── ecosystem.config.js     # PM2 Config
```

## 🔒 Security

### Firewall (UFW)
```bash
# Status
ufw status

# Ports öffnen/schließen
ufw allow 8080/tcp
ufw delete allow 8080/tcp
```

### SSL/HTTPS (Optional)

Für Production solltest du Nginx + Let's Encrypt nutzen:

```bash
# Nginx installieren
apt install nginx certbot python3-certbot-nginx

# SSL Zertifikat
certbot --nginx -d deine-domain.de
```

## 📈 Monitoring

### System Resources
```bash
# CPU + RAM
htop

# Disk Space
df -h

# Network
iftop
```

### Application Logs
```bash
# API Logs
pm2 logs rag-api

# Qdrant Logs
docker logs -f qdrant

# Ollama Logs
journalctl -u ollama -f
```

## 🐛 Troubleshooting

### Problem: Ollama antwortet nicht
```bash
# Service neu starten
systemctl restart ollama

# Model neu laden
ollama pull llama3.1:8b
```

### Problem: Qdrant nicht erreichbar
```bash
# Container Status
docker ps -a

# Container neu starten
docker restart qdrant

# Logs checken
docker logs qdrant
```

### Problem: API gibt 500 Fehler
```bash
# Logs anschauen
pm2 logs rag-api --lines 50

# API neu starten
pm2 restart rag-api
```

### Problem: Zu langsam / Out of Memory
```bash
# Swap checken
free -h

# Prozesse checken
top

# Ggf. mehr Swap
dd if=/dev/zero of=/swapfile2 bs=1M count=8192
chmod 600 /swapfile2
mkswap /swapfile2
swapon /swapfile2
```

## 🚀 Next Steps

### 1. Frontend erstellen

Du kannst eine simple HTML/React App erstellen:

```html
<!-- /opt/rag-system/public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>RAG Chat</title>
</head>
<body>
  <h1>Dokumenten-Chat</h1>
  
  <div>
    <input type="file" id="pdfFile" accept=".pdf">
    <button onclick="uploadPDF()">Upload</button>
  </div>
  
  <div>
    <input type="text" id="question" placeholder="Frage...">
    <button onclick="askQuestion()">Fragen</button>
  </div>
  
  <div id="answer"></div>
  
  <script>
    async function uploadPDF() {
      const file = document.getElementById('pdfFile').files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      alert(result.message);
    }
    
    async function askQuestion() {
      const question = document.getElementById('question').value;
      
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      
      const result = await response.json();
      document.getElementById('answer').innerHTML = 
        `<strong>Antwort:</strong> ${result.answer}<br>
         <strong>Quellen:</strong> ${result.sources.join(', ')}`;
    }
  </script>
</body>
</html>
```

### 2. Besseres Modell testen

Falls 8B nicht reicht:
```bash
ollama pull llama3.1:13b  # Braucht ~13 GB RAM
```

### 3. In CasaManager integrieren

Aus deinem NestJS Backend:
```typescript
// In CasaManager
async analyzeContract(pdfBuffer: Buffer) {
  const formData = new FormData();
  formData.append('file', pdfBuffer, 'contract.pdf');
  
  await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
  });
}

async askContractQuestion(question: string) {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  
  return await response.json();
}
```

## 💡 Tips

1. **Backup:** Sichere `/opt/rag-system/qdrant` regelmäßig
2. **Updates:** `ollama update` für neue Ollama Versionen
3. **Logs:** Rotiere Logs mit `logrotate`
4. **Performance:** Bei mehr RAM → größeres Modell (13B, 70B)

## 📞 Support

Bei Problemen:
1. Check Logs: `pm2 logs`, `docker logs qdrant`
2. Test einzelne Komponenten
3. Discord / GitHub Issues

## 🎉 Fertig!

Dein RAG System läuft jetzt!

```
┌─────────────────────────────────┐
│  🎯 RAG System Ready!           │
│                                 │
│  API:    http://IP:3000         │
│  Qdrant: http://IP:6333         │
│  Ollama: http://IP:11434        │
└─────────────────────────────────┘
```
