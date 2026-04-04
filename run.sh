#!/bin/bash

echo "=== Démarrage du proxy SSH WebSocket ==="

# Démarrer Dropbear sur le port 40000 (optionnel, pour un serveur SSH local)
dropbear -R -F -p 40000 -W 65535 2>/dev/null &

# Démarrer le proxy Node.js
node proxy3.js
