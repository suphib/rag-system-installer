# PDF View & Download Feature Update

## 🎯 Was ist neu?

Diese Update fügt folgende Funktionen hinzu:

### ✅ PDF-Speicherung
- PDFs werden beim Upload **permanent gespeichert** in `/opt/rag-system/documents/`
- Bisher wurden PDFs nach der Indexierung gelöscht

### ✅ PDF ansehen im Browser
- **Klick auf Dateiname** → PDF öffnet in neuem Tab
- **"Ansehen" Button** → Gleiche Funktion wie Klick auf Name
- PDFs werden direkt im Browser angezeigt (kein Download nötig)

### ✅ PDF Download
- **"Download" Button** → PDF herunterladen
- Originaldateiname wird beibehalten

### ✅ Verbesserte Tabelle
- Dateiname ist jetzt ein klickbarer Link
- 3 Action-Buttons pro Dokument:
  - **Ansehen** (Blau) - PDF im Browser öffnen
  - **Download** (Grün) - PDF herunterladen
  - **Löschen** (Rot) - Dokument + Chunks löschen

---

## 📋 Installation auf dem Server

### Schritt 1: Dateien hochladen

```bash
# Auf lokalem Rechner (im rag-system-local Verzeichnis)
scp -r api web-ui update-pdf-view.sh root@45.92.217.15:/tmp/rag-update/
```

### Schritt 2: Update-Script ausführen

```bash
# Auf dem Server via SSH
ssh root@45.92.217.15

# Zum Update-Verzeichnis wechseln
cd /tmp/rag-update

# Script ausführbar machen
chmod +x update-pdf-view.sh

# Update durchführen
./update-pdf-view.sh
```

Das Script macht automatisch:
1. ✅ Erstellt `/opt/rag-system/documents/` Verzeichnis
2. ✅ Erstellt Backups aller geänderten Dateien
3. ✅ Kopiert neue Dateien nach `/opt/rag-system/`
4. ✅ Baut das API neu (`npm run build`)
5. ✅ Startet PM2 Services neu

---

## 🧪 Testen

Nach dem Update:

1. **Neues PDF hochladen** über die Web-UI
2. **Dateiname klicken** → PDF öffnet in neuem Tab
3. **"Ansehen" Button** → Gleicher Effekt
4. **"Download" Button** → PDF wird heruntergeladen
5. **"Löschen" Button** → Bestätigung, dann löschen

---

## 📁 Geänderte Dateien

### Backend (API)
**`api/src/routes/index.ts`**
- Upload-Route: PDFs werden jetzt gespeichert (Zeile 42-50)
- Neuer Endpoint: `GET /documents/:filename/view` (Zeile 145-161)
- Neuer Endpoint: `GET /documents/:filename/download` (Zeile 163-178)

### Frontend (Web-UI)
**`web-ui/app.js`**
- `loadDocuments()`: Dateiname als Link (Zeile 452-458)
- 3 Action-Buttons statt nur Löschen (Zeile 465-475)

**`web-ui/style.css`**
- `.pdf-link` Styles für Dateinamen-Links (Zeile 668-686)
- `.view-doc-btn`, `.download-doc-btn` Button-Styles (Zeile 688-740)
- Actions-Spalte breiter gemacht (20% statt 12%)

---

## ⚠️ Wichtig

### Alte PDFs
**Bereits hochgeladene PDFs** vor diesem Update:
- ❌ Können **nicht** angesehen oder heruntergeladen werden
- ✅ Funktionieren weiterhin für **Queries** (sind in Qdrant indexiert)
- ℹ️ Grund: PDFs wurden nach Upload gelöscht

**Neu hochgeladene PDFs** nach dem Update:
- ✅ Können angesehen werden
- ✅ Können heruntergeladen werden
- ✅ Funktionieren für Queries

### Speicherplatz
- PDFs werden in `/opt/rag-system/documents/` gespeichert
- Bei vielen/großen PDFs: Speicherplatz im Auge behalten
- Beim Löschen über UI wird auch die PDF-Datei gelöscht

---

## 🔧 Manuelle Installation (Alternative)

Falls das Script nicht funktioniert:

### 1. Verzeichnis erstellen
```bash
mkdir -p /opt/rag-system/documents
chmod 755 /opt/rag-system/documents
```

### 2. Dateien manuell kopieren
```bash
cp /tmp/rag-update/api/src/routes/index.ts /opt/rag-system/api/src/routes/
cp /tmp/rag-update/web-ui/app.js /opt/rag-system/web-ui/
cp /tmp/rag-update/web-ui/style.css /opt/rag-system/web-ui/
```

### 3. API neu bauen
```bash
cd /opt/rag-system/api
npm run build
```

### 4. Services neu starten
```bash
pm2 restart rag-api
```

---

## 🐛 Troubleshooting

### PDF öffnet nicht
**Symptom:** Klick auf Dateiname → 404 Fehler

**Lösung:**
```bash
# Prüfen ob Verzeichnis existiert
ls -la /opt/rag-system/documents/

# Prüfen ob API läuft
pm2 status

# API Logs checken
pm2 logs rag-api
```

### "PDF not found" Fehler
**Ursache:** PDF wurde vor dem Update hochgeladen

**Lösung:** PDF neu hochladen

### Buttons funktionieren nicht
**Ursache:** Browser-Cache

**Lösung:**
1. Hard Reload: `Ctrl + Shift + R` (oder `Cmd + Shift + R` auf Mac)
2. Browser-Cache leeren
3. Inkognito-Tab testen

---

## 🎨 UI Vorschau

**Dokumenten-Tabelle:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ DATEINAME        │ CHUNKS │ SEITEN │ GRÖẞE │ ... │ AKTIONEN           │
├─────────────────────────────────────────────────────────────────────┤
│ Mietvertrag.pdf  │   22   │   16   │ 456KB │ ... │ [Ansehen] [Down…  │
│                  │        │        │       │     │          load] [×] │
└─────────────────────────────────────────────────────────────────────┘
```

- **Dateiname** = Klickbarer Link (blau)
- **[Ansehen]** = Blauer Button
- **[Download]** = Grüner Button
- **[×]** = Roter Löschen-Button

---

## 📞 Support

Bei Problemen:
1. API-Logs prüfen: `pm2 logs rag-api`
2. Browser-Konsole öffnen (F12)
3. Backups sind hier: `/opt/rag-system/api/src/routes/index.ts.backup-pdf-view`

**Rollback:**
```bash
cd /opt/rag-system/api/src/routes
cp index.ts.backup-pdf-view index.ts
cd /opt/rag-system/api
npm run build
pm2 restart rag-api
```
