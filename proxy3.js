const crypto = require("crypto");
const net = require('net');
const fs = require('fs');

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

const server = net.createServer();
server.on('connection', function(socket) {
    var authenticated = false;
    var authTimer = setTimeout(() => {
        if(!authenticated) {
            socket.destroy();
        }
    }, 10000);
    
    socket.on('data', function(data) {
        if(!authenticated) {
            const authData = data.toString().trim();
            const [user, pass] = authData.split(':');
            
            if(authenticate(user, pass)) {
                authenticated = true;
                clearTimeout(authTimer);
                socket.write("AUTH OK\r\n");
                
                var conn = net.createConnection({host: dhost, port: dport});
                conn.on('data', (connData) => socket.write(connData));
                conn.on('error', () => socket.destroy());
                socket.on('data', (sockData) => conn.write(sockData));
                socket.on('close', () => conn.destroy());
            } else {
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
