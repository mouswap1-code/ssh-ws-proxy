#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

// Charger les utilisateurs
function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { users: [] };
    }
}

// Sauvegarder les utilisateurs
function saveUsers(data) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log("✅ Utilisateurs sauvegardés");
}

// Lister tous les utilisateurs
function listUsers() {
    const data = loadUsers();
    console.log("\n📋 LISTE DES UTILISATEURS");
    console.log("=".repeat(50));
    console.log("ID | Nom | Expire le | Max | Statut");
    console.log("-".repeat(50));
    data.users.forEach(user => {
        console.log(`${user.id} | ${user.username} | ${user.expiry} | ${user.max_users} | ${user.status}`);
    });
    console.log("=".repeat(50));
    console.log(`Total: ${data.users.length} utilisateurs\n`);
}

// Ajouter un utilisateur
function addUser(username, password, expiry, max_users, notes) {
    const data = loadUsers();
    const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    
    const newUser = {
        id: newId,
        username: username,
        password: password,
        expiry: expiry || "2026-12-31",
        max_users: parseInt(max_users) || 1,
        notes: notes || "",
        created_at: new Date().toISOString().split('T')[0],
        status: "active"
    };
    
    data.users.push(newUser);
    saveUsers(data);
    console.log(`✅ Utilisateur ${username} ajouté avec ID ${newId}`);
}

// Modifier un utilisateur
function updateUser(id, field, value) {
    const data = loadUsers();
    const user = data.users.find(u => u.id == id);
    
    if (!user) {
        console.log(`❌ Utilisateur avec ID ${id} non trouvé`);
        return;
    }
    
    if (field === "username") user.username = value;
    else if (field === "password") user.password = value;
    else if (field === "expiry") user.expiry = value;
    else if (field === "max_users") user.max_users = parseInt(value);
    else if (field === "notes") user.notes = value;
    else if (field === "status") user.status = value;
    else {
        console.log(`❌ Champ ${field} inconnu`);
        return;
    }
    
    saveUsers(data);
    console.log(`✅ Utilisateur ${user.username} modifié (${field} = ${value})`);
}

// Supprimer un utilisateur
function deleteUser(id) {
    const data = loadUsers();
    const user = data.users.find(u => u.id == id);
    
    if (!user) {
        console.log(`❌ Utilisateur avec ID ${id} non trouvé`);
        return;
    }
    
    data.users = data.users.filter(u => u.id != id);
    saveUsers(data);
    console.log(`✅ Utilisateur ${user.username} supprimé`);
}

// Changer le statut (activer/désactiver)
function toggleStatus(id) {
    const data = loadUsers();
    const user = data.users.find(u => u.id == id);
    
    if (!user) {
        console.log(`❌ Utilisateur avec ID ${id} non trouvé`);
        return;
    }
    
    user.status = user.status === "active" ? "disabled" : "active";
    saveUsers(data);
    console.log(`✅ Utilisateur ${user.username} est maintenant ${user.status}`);
}

// Interface en ligne de commande
const args = process.argv.slice(2);
const command = args[0];

switch(command) {
    case "list":
        listUsers();
        break;
    case "add":
        addUser(args[1], args[2], args[3], args[4], args[5]);
        break;
    case "update":
        updateUser(args[1], args[2], args[3]);
        break;
    case "delete":
        deleteUser(args[1]);
        break;
    case "toggle":
        toggleStatus(args[1]);
        break;
    default:
        console.log(`
📚 COMMANDES DISPONIBLES:

  node user-manager.js list
      → Afficher tous les utilisateurs

  node user-manager.js add <username> <password> [expiry] [max_users] [notes]
      → Ajouter un utilisateur
      Ex: node user-manager.js add test pass123 2026-12-31 3 "Client test"

  node user-manager.js update <id> <field> <value>
      → Modifier un utilisateur (champs: username, password, expiry, max_users, notes, status)

  node user-manager.js delete <id>
      → Supprimer un utilisateur

  node user-manager.js toggle <id>
      → Activer/Désactiver un utilisateur
`);
                       }
