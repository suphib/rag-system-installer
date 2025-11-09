# RAG System Installer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Shell Script](https://img.shields.io/badge/Shell-Bash-green.svg)](https://www.gnu.org/software/bash/)
[![Platform](https://img.shields.io/badge/Platform-Debian%2012-blue.svg)](https://www.debian.org/)

**Production-ready automated installer for a complete RAG (Retrieval Augmented Generation) system on Debian 12 servers.**

Deploy a fully functional document Q&A system with LLM-powered responses in ~30-40 minutes.

## 🚀 Features

- **Ollama LLM Runtime** - Llama 3.1 8B for natural language generation
- **Nomic Embed Text** - Dedicated 768-dimensional embeddings for semantic search
- **Qdrant Vector Database** - High-performance similarity search with Docker
- **TypeScript REST API** - Production-grade API with PM2 process management
- **Automated Deployment** - One-command installation with comprehensive error handling
- **Security Hardened** - UFW firewall + Fail2ban SSH protection included

## 📋 System Requirements

**Tested on EPYC 03 Servers (24fire.de):**
- CPU: 4 cores (AMD EPYC recommended)
- RAM: 24 GB DDR5 ECC
- Storage: 150 GB NVMe SSD (minimum 50 GB free)
- OS: Debian 12 (Bookworm)
- Network: Stable internet connection for model downloads (~5 GB)

**Works on any Debian 12 system with sufficient resources.**

## ⚡ Quick Start

```bash
# 1. Connect to your server
ssh root@YOUR-SERVER-IP

# 2. Clone this repository
git clone https://github.com/YOUR-USERNAME/rag-system-installer.git
cd rag-system-installer/files

# 3. Make scripts executable
chmod +x *.sh

# 4. Run the installer
./00-install-all.sh
```

That's it! The installer will:
- Install Docker, Ollama, Node.js 20
- Download Llama 3.1 8B and Nomic Embed Text models
- Set up Qdrant vector database
- Deploy and start the TypeScript API
- Configure firewall and security

**Installation time:** ~30-40 minutes (mostly model downloads)

## 📚 What Gets Installed

| Component | Version | Purpose | Size |
|-----------|---------|---------|------|
| **Ollama** | Latest | LLM runtime | - |
| **Llama 3.1 8B** | Chat model | Text generation | ~4.7 GB |
| **Nomic Embed Text** | Embedding model | Semantic embeddings (768 dim) | ~275 MB |
| **Qdrant** | Latest (Docker) | Vector database | ~100 MB |
| **Node.js** | 20.x | JavaScript runtime | ~50 MB |
| **TypeScript API** | Custom | REST API server | ~200 MB |
| **PM2** | Latest | Process manager | - |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client                           │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────────┐
│              TypeScript API (Port 3000)             │
│  • PDF Upload & Parsing                             │
│  • Document Chunking                                │
│  • RAG Query Processing                             │
└─────────┬─────────────────────────┬─────────────────┘
          │                         │
          │ Embeddings              │ Vector Search
          ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  Ollama (11434)     │   │  Qdrant (6333)      │
│  • Llama 3.1 8B     │   │  • Vector Storage   │
│  • Nomic Embed      │   │  • Similarity Search│
└─────────────────────┘   └─────────────────────┘
```

## 🔌 API Endpoints

Once installed, the API runs on `http://YOUR-SERVER-IP:3000`

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Upload PDF
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "success": true,
  "filename": "document.pdf",
  "chunks": 12,
  "message": "Successfully indexed 12 chunks"
}
```

### Ask Question
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main topics in the documents?",
    "maxResults": 5
  }'
```

**Response:**
```json
{
  "answer": "Based on the documents...",
  "sources": ["document.pdf", "report.pdf"],
  "processingTime": 3247
}
```

### Collection Stats
```bash
curl http://localhost:3000/api/stats
```

## 📖 Documentation

| File | Description |
|------|-------------|
| [`files/README.md`](files/README.md) | Complete technical documentation (German) |
| [`files/INSTALL.txt`](files/INSTALL.txt) | Quick installation guide |
| [`files/CHEATSHEET.txt`](files/CHEATSHEET.txt) | Command reference for daily operations |
| [`files/CHANGELOG.txt`](files/CHANGELOG.txt) | Version history and bug fixes |
| [`CLAUDE.md`](CLAUDE.md) | AI assistant guidance for developers |

## 🔧 Management Commands

### API Management (PM2)
```bash
pm2 status              # View service status
pm2 logs rag-api        # View live logs
pm2 restart rag-api     # Restart API
pm2 monit               # Resource monitoring
```

### Qdrant Management (Docker)
```bash
docker ps               # Container status
docker logs qdrant      # View logs
docker restart qdrant   # Restart database
```

### Ollama Management
```bash
ollama list             # List installed models
ollama pull MODEL       # Download new model
systemctl status ollama # Service status
```

## 🛡️ Security Features

- **UFW Firewall** - Allows only SSH (22), HTTP (80/443), and API (3000)
- **Fail2ban** - Automatic SSH brute-force protection
- **No Root Exposure** - Services run in isolated containers/processes
- **No External Dependencies** - 100% on-premise, no cloud APIs

## 📊 Performance

**On EPYC 03 (4 cores, 24GB RAM):**
- First query: ~10 seconds (model warmup)
- Subsequent queries: ~2-4 seconds (simple), ~5-10 seconds (complex)
- Embedding generation: ~0.5-1 second per document chunk
- Concurrent users: 1-2 (CPU-bound)
- Tokens/second: ~5-8 (CPU inference)

**For better performance:**
- Upgrade to larger models (13B, 70B) with more RAM
- Add GPU support for 10x faster inference
- Scale horizontally with load balancer

## 🐛 Troubleshooting

### API won't start
```bash
pm2 logs rag-api        # Check logs
pm2 restart rag-api     # Restart
```

### Qdrant connection failed
```bash
docker ps -a            # Check container
docker logs qdrant      # View logs
docker restart qdrant   # Restart
```

### Out of memory
```bash
free -h                 # Check memory
htop                    # Monitor processes
```

**Solution:** Add more swap or use smaller model (8B instead of 13B)

### Test the system
```bash
cd /root/rag-system-installer/files
./05-test-system.sh
```

## 📦 Installation Scripts

| Script | Purpose | Duration |
|--------|---------|----------|
| `00-install-all.sh` | Master script (runs all steps) | ~30-40 min |
| `01-initial-setup.sh` | System setup, Docker, firewall | ~5 min |
| `02-install-rag.sh` | Qdrant + Ollama + models | ~15 min |
| `03-install-api.sh` | Node.js + dependencies | ~5 min |
| `04-create-api-code.sh` | Generate API code + build | ~3 min |
| `05-test-system.sh` | Verify installation | ~2 min |

## 🔄 Version History

### Version 1.1 (Current) - November 2024
**Critical fixes from v1.0:**
- ✅ Fixed vector dimension mismatch (now 768 for nomic-embed-text)
- ✅ Fixed Ollama test command syntax
- ✅ Added jq package dependency
- ✅ Improved PM2 startup robustness
- ✅ Added retry mechanism for model downloads
- ✅ Fixed UFW/Docker compatibility

See [`files/CHANGELOG.txt`](files/CHANGELOG.txt) for details.

## 🎯 Use Cases

- **Document Q&A Systems** - Upload contracts, manuals, research papers
- **Knowledge Base Search** - Semantic search across company documentation
- **Research Assistant** - Query academic papers and technical docs
- **Legal Document Analysis** - Find relevant clauses and terms
- **Customer Support** - Answer questions from product documentation

## 🚧 Roadmap

- [ ] Add support for other document formats (DOCX, TXT, Markdown)
- [ ] Implement streaming responses for better UX
- [ ] Add multi-user authentication
- [ ] GPU support for faster inference
- [ ] Frontend web UI
- [ ] Docker Compose all-in-one deployment
- [ ] Support for other LLM models (Mistral, Phi, etc.)

## 💰 Cost

**EPYC 03 Server:** €22.99/month (24fire.de)
- No additional cloud costs
- No API fees
- 100% on-premise
- Full data privacy

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test on Debian 12
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Credits

Built with:
- [Ollama](https://ollama.ai/) - LLM runtime
- [Qdrant](https://qdrant.tech/) - Vector database
- [Llama 3.1](https://ai.meta.com/llama/) - Meta's language model
- [Nomic Embed Text](https://www.nomic.ai/) - Embedding model

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/YOUR-USERNAME/rag-system-installer/issues)
- **Documentation:** See `files/` directory
- **Installation Log:** `/root/rag-setup.log` on server

## ⚠️ Important Notes

- First installation requires stable internet (5+ GB downloads)
- Server needs at least 24 GB RAM for optimal performance
- PDFs must contain text (OCR required for scanned documents)
- First query after startup takes ~10 seconds (model loading)
- All data stays on your server (no external API calls)

---

**Ready to deploy your own RAG system?** Get started in 3 commands! 🚀

```bash
git clone https://github.com/YOUR-USERNAME/rag-system-installer.git
cd rag-system-installer/files
./00-install-all.sh
```
