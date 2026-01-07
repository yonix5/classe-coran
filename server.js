require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:"],
        },
    },
}));

// CORS with restrictions
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*', // Restrict in production
    credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Fichier pour stocker les réservations
const reservationsFile = path.join(__dirname, 'reservations.json');

// Fonction de sanitisation basique
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>\"'&]/g, ''); // Remove basic XSS chars
}

// Charger les réservations depuis le fichier
function loadReservations() {
    try {
        const data = fs.readFileSync(reservationsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return []; // Si le fichier n'existe pas, retourner un tableau vide
    }
}

// Sauvegarder les réservations dans le fichier
function saveReservations(reservations) {
    fs.writeFileSync(reservationsFile, JSON.stringify(reservations, null, 2));
}

// Charger les réservations au démarrage
let reservations = loadReservations();

// Liste des clients SSE
let clients = [];

// Route pour SSE
app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    // Ajouter le client à la liste
    clients.push(res);

    // Supprimer le client quand il se déconnecte
    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

// Fonction pour envoyer les réservations à tous les clients
function sendReservationsToClients() {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(reservations)}\n\n`);
    });
}

// Route pour récupérer les réservations
app.get('/reservations', (req, res) => {
    res.json(reservations);
});

// Route pour modifier une réservation
app.put('/reservations/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const { name, date, type } = req.body;

    // Validation et sanitisation
    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName || sanitizedName.length > 100) {
        return res.status(400).json({ error: 'Nom invalide.' });
    }
    if (!['Trajet : mosquée Étampes vers maison de cheikh Moussa', 'Trajet : maison de cheikh Moussa vers mosquée Étampes'].includes(type)) {
        return res.status(400).json({ error: 'Type de trajet invalide.' });
    }

    // Valider que la date est un vendredi
    function isFridayISO(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return false;
        return d.getDay() === 5;
    }

    if (!isFridayISO(date)) {
        return res.status(400).json({ error: 'La date doit être un vendredi.' });
    }
    if (index >= 0 && index < reservations.length) {
        // Vérifier si la nouvelle date/type est déjà pris (sauf pour la même réservation)
        const isTaken = reservations.some((res, i) => i !== index && res.date === date && res.type === type);
        if (isTaken) {
            return res.status(400).json({ error: 'Cette date et ce type sont déjà réservés.' });
        }

        reservations[index] = { name: sanitizedName, date, type };
        saveReservations(reservations);
        sendReservationsToClients();
        res.json(reservations[index]);
    } else {
        res.status(404).json({ error: 'Réservation non trouvée.' });
    }
});

// Route pour ajouter une réservation
app.post('/reservations', (req, res) => {
    const { name, date, type } = req.body;

    // Validation et sanitisation
    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName || sanitizedName.length > 100) {
        return res.status(400).json({ error: 'Nom invalide.' });
    }
    if (!['Trajet : mosquée Étampes vers maison de cheikh Moussa', 'Trajet : maison de cheikh Moussa vers mosquée Étampes'].includes(type)) {
        return res.status(400).json({ error: 'Type de trajet invalide.' });
    }

    // Valider que la date est un vendredi
    function isFridayISO(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return false;
        return d.getDay() === 5;
    }

    if (!isFridayISO(date)) {
        return res.status(400).json({ error: 'La date doit être un vendredi.' });
    }
    // Vérifier si la date et le type sont déjà pris
    const isTaken = reservations.some(res => res.date === date && res.type === type);

    if (isTaken) {
        return res.status(400).json({ error: 'Cette date et ce type sont déjà réservés.' });
    }

    // Ajouter la réservation
    const newReservation = { name: sanitizedName, date, type };
    reservations.push(newReservation);

    // Sauvegarder dans le fichier
    saveReservations(reservations);

    // Envoyer la mise à jour à tous les clients
    sendReservationsToClients();

    res.status(201).json(newReservation);
});

// Route pour supprimer une réservation
app.delete('/reservations/:index', (req, res) => {
    const index = parseInt(req.params.index);
    console.log('DELETE request for index:', index, 'Reservations length:', reservations.length);
    if (index >= 0 && index < reservations.length) {
        reservations.splice(index, 1);
        saveReservations(reservations);
        sendReservationsToClients();
        console.log('Reservation deleted successfully');
        res.status(204).send();
    } else {
        console.log('Invalid index for deletion');
        res.status(404).json({ error: 'Réservation non trouvée.' });
    }
});

// Mot de passe admin depuis les variables d'environnement
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Route pour vérifier le mot de passe admin
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    const sanitizedPassword = sanitizeInput(password);
    if (sanitizedPassword === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Mot de passe incorrect.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${port} et accessible depuis le réseau`);
});