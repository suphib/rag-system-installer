#!/bin/bash

##################################################
# EPYC 03 Initial Setup
# Für: LLM RAG System (Ollama + Qdrant)
##################################################

set -e  # Exit on error

echo "🚀 Starting EPYC 03 Initial Setup..."

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. System updaten
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# 2. Essentials installieren
echo -e "${YELLOW}🔧 Installing essential packages...${NC}"
apt install -y \
    curl \
    wget \
    git \
    htop \
    ufw \
    fail2ban \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    jq

# 3. Firewall konfigurieren
echo -e "${YELLOW}🔥 Configuring firewall (UFW)...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # API (später anpassen)
ufw --force enable

# 4. Fail2ban konfigurieren (SSH Brute-Force Protection)
echo -e "${YELLOW}🛡️ Setting up Fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

# 5. Docker installieren
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Docker Compose installieren
echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
apt install -y docker-compose

# Docker automatisch starten
systemctl enable docker
systemctl start docker

# UFW für Docker konfigurieren (verhindert Networking-Probleme)
echo -e "${YELLOW}🔧 Configuring UFW for Docker...${NC}"
ufw reload

# 6. Ollama installieren
echo -e "${YELLOW}🤖 Installing Ollama...${NC}"
curl -fsSL https://ollama.com/install.sh | sh

# Ollama Service starten
systemctl enable ollama
systemctl start ollama

# Warte bis Ollama bereit ist
echo -e "${YELLOW}⏳ Waiting for Ollama to be ready...${NC}"
sleep 5

# 7. Verzeichnisstruktur erstellen
echo -e "${YELLOW}📁 Creating directory structure...${NC}"
mkdir -p /opt/rag-system/{qdrant,documents,api,logs}
cd /opt/rag-system

# 8. Swap erstellen (wichtig bei 24GB RAM!)
echo -e "${YELLOW}💾 Creating 8GB swap file...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 8G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Swappiness auf 10 setzen (nur bei wenig RAM swappen)
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl -p
fi

# 9. System-Informationen anzeigen
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "=========================================="
echo "System Information:"
echo "=========================================="
echo "CPU Cores: $(nproc)"
echo "Total RAM: $(free -h | awk '/^Mem:/{print $2}')"
echo "Available RAM: $(free -h | awk '/^Mem:/{print $7}')"
echo "Swap: $(free -h | awk '/^Swap:/{print $2}')"
echo "Disk Space: $(df -h / | awk 'NR==2{print $4}') available"
echo ""
echo "Docker: $(docker --version)"
echo "Ollama: $(ollama --version)"
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Server is ready for RAG setup!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run: ./02-install-rag.sh"
