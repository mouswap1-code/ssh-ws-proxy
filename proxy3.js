const crypto = require("crypto");
const net = require('net');
const fs = require('fs');
const http = require('http');

var dhost = process.env.DHOST || "127.0.0.1";
var dport = process.env.DPORT || 22;
var mainPort = process.env.PORT || 8080;

// Charger les utilisateurs
let usersData = { users: [] };
try {
    usersData = JSON.parse(fs.readFileSync('/app/users.json', 'utf8'));
    console.log("[INFO] Utilisateurs chargés: " + usersData.users.length);
} catch(e) {
    console.log("[WARN] Aucun fichier users.json trouvé");
}

function authenticate(user, pass) {
    const userEntry = usersData.users.find(u => u.username === user);
    if (!userEntry) return false;
    if (userEntry.password !== pass) return false;
    if (userEntry.status !== "active") return false;
    const expiry = new Date(userEntry.expiry);
    const now = new Date();
    if (now > expiry) return false;
    console.log("[AUTH] OK: " + user + " (expire: " + userEntry.expiry + ")");
    return true;
}

// Créer un serveur HTTP pour le health check
const httpServer = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
    }
    res.writeHead(404);
    res.end('Not Found');
});

// Gérer les connexions WebSocket ou TCP brut via le même port
// On utilise l'événement 'upgrade' pour les WebSockets, ou on écoute en TCP brut sur un port séparé
// Mais Cloud Run ne supporte pas les sockets bruts. Il faut utiliser un proxy WebSocket.

// Solution simple : transformer le tunnel en WebSocket
// Pour l'instant, on crée un serveur TCP séparé sur un autre port (mais Cloud Run n'expose qu'un seul port)
// Donc la bonne solution est de faire un proxy WebSocket.

// Pour ce cas, on va garder le serveur TCP mais en faire un serveur WebSocket (nécessite ws)
// Ici on utilise 'ws' pour créer un serveur WebSocket.

// Je vais réécrire la partie TCP en WebSocket avec authentification.

const WebSocket = require('ws');

const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

wss.on('connection', (ws, req) => {
    console.log('[WS] Nouvelle connexion WebSocket');
    let authenticated = false;
    let authTimer = setTimeout(() => {
        if (!authenticated) ws.close();
    }, 10000);

    ws.on('message', (message) => {
        if (!authenticated) {
            const authData = message.toString().trim();
            const [user, pass] = authData.split(':');
            if (authenticate(user, pass)) {
                authenticated = true;
                clearTimeout(authTimer);
                ws.send('AUTH OK');
                const conn = net.createConnection({ host: dhost, port: dport });
                conn.on('data', (connData) => ws.send(connData));
                conn.on('error', () => ws.close());
                ws.on('message', (sockData) => conn.write(sockData));
                ws.on('close', () => conn.destroy());
            } else {
                ws.send('AUTH FAILED');
                ws.close();
            }
        }
    });
});

httpServer.listen(mainPort, '0.0.0.0', () => {
    console.log("[INFO] Serveur HTTP/WebSocket démarré sur le port: " + mainPort);
    console.log("[INFO] Redirection vers: " + dhost + ":" + dport);
});
