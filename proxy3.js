const crypto = require("crypto");
const net = require('net');
const fs = require('fs');

// Configuration
var dhost = process.env.DHOST || "127.0.0.1";
var dport = process.env.DPORT || 22;
var mainPort = process.env.PORT || 8080;
var packetsToSkip = process.env.PACKSKIP || 1;

// Charger les utilisateurs
let users = {};
try {
    users = JSON.parse(fs.readFileSync('/etc/users.json', 'utf8'));
    console.log("[INFO] Utilisateurs chargés: " + Object.keys(users).length);
} catch(e) {
    console.log("[WARN] Aucun fichier users.json trouvé");
}

// Fonction d'authentification
function authenticate(user, pass) {
    if (!users[user]) return false;
    if (users[user].password !== pass) return false;
    
    // Vérifier expiration
    const expiry = new Date(users[user].expiry);
    const now = new Date();
    if (now > expiry) return false;
    
    console.log("[AUTH] Utilisateur authentifié: " + user + " (expire le " + users[user].expiry + ")");
    return true;
}

function gcollector() {
    if(global.gc) {
        global.gc();
    }
}
setInterval(gcollector, 1000);

const server = net.createServer();
server.on('connection', function(socket) {
    var packetCount = 0;
    var authenticated = false;
    var authTimer = setTimeout(() => {
        if(!authenticated) {
            console.log("[AUTH] Timeout d'authentification pour " + socket.remoteAddress);
            socket.destroy();
        }
    }, 10000);
    
    // Envoyer la bannière d'authentification
    socket.write("SSH-WS-PROXY v1.0\r\nAuthentification requise\r\n");
    
    socket.on('data', function(data) {
        if(!authenticated) {
            // Attendre les identifiants au format "user:pass\n"
            const authData = data.toString().trim();
            const [user, pass] = authData.split(':');
            
            if(authenticate(user, pass)) {
                authenticated = true;
                clearTimeout(authTimer);
                socket.write("AUTH OK\r\n");
                console.log("[INFO] Connexion autorisée de " + socket.remoteAddress);
                
                // Établir la connexion vers le VPS
                var conn = net.createConnection({host: dhost, port: dport});
                conn.on('data', function(connData) {
                    socket.write(connData);
                });
                conn.on('error', function(error) {
                    console.log("[REMOTE] Erreur: " + error);
                    socket.destroy();
                });
                socket.on('data', function(sockData) {
                    if(packetCount >= packetsToSkip) {
                        conn.write(sockData);
                    }
                    packetCount++;
                });
                socket.on('close', function() {
                    console.log("[INFO] Déconnexion de " + socket.remoteAddress);
                    conn.destroy();
                });
            } else {
                console.log("[AUTH] Échec pour " + user + " depuis " + socket.remoteAddress);
                socket.write("AUTH FAILED\r\n");
                socket.destroy();
            }
        }
    });
});

server.listen(mainPort, function(){
    console.log("[INFO] Serveur démarré sur le port: " + mainPort);
    console.log("[INFO] Redirection vers: " + dhost + ":" + dport);
});
