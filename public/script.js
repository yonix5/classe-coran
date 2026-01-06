const serverUrl = window.location.origin;
const tableBody = document.querySelector('#reservationsTable tbody');
const form = document.getElementById('reservationForm');
const errorMessage = document.getElementById('errorMessage');

// Initialiser Flatpickr pour le sélecteur de dates en français
// Autoriser seulement les vendredis (getDay() === 5)
flatpickr("#date", {
    locale: "fr",
    dateFormat: "d/m/Y",
    allowInput: true,
    enable: [function(date) { return date.getDay() === 5; }]
});

// Vérifie qu'une date ISO (YYYY-MM-DD) est un vendredi
function isFridayISO(isoDate) {
    const d = new Date(isoDate);
    return d.getDay() === 5;
}

// Bouton Admin
const adminBtn = document.getElementById('adminBtn');
adminBtn.addEventListener('click', () => {
    window.location.href = 'admin.html';
});

// Fonction pour afficher les réservations dans le tableau (triées par date croissante)
function displayReservations(reservations) {
    tableBody.innerHTML = ''; // Vider le tableau
    // Trier par date (les plus anciennes en premier)
    const sorted = reservations.slice().sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        return da - db; // croissant
    });

    sorted.forEach(res => {
        const row = tableBody.insertRow();
        // Formater la date en français
        const formattedDate = new Date(res.date).toLocaleDateString('fr-FR');
        row.insertCell(0).textContent = formattedDate;
        row.insertCell(1).textContent = res.name;
        row.insertCell(2).textContent = res.type;
    });
}

// Charger les réservations initiales
async function loadReservations() {
    try {
        const response = await fetch(`${serverUrl}/reservations`);
        const reservations = await response.json();
        displayReservations(reservations);
    } catch (error) {
        console.error('Erreur lors du chargement des réservations:', error);
    }
}

loadReservations();

// Écouter les événements SSE pour mises à jour en temps réel
const eventSource = new EventSource(`${serverUrl}/events`);
eventSource.onmessage = function(event) {
    const reservations = JSON.parse(event.data);
    displayReservations(reservations);
};

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const dateInput = document.getElementById('date').value;
    // Convertir la date française en ISO pour le serveur
    const [day, month, year] = dateInput.split('/');
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Valider que la date est un vendredi
    if (!isFridayISO(isoDate)) {
        errorMessage.textContent = 'La date doit être un vendredi.';
        errorMessage.style.display = 'block';
        return;
    }
    const type = document.getElementById('type').value;

    try {
        const response = await fetch(`${serverUrl}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, date: isoDate, type })
        });

        if (response.ok) {
            // La mise à jour sera automatique via SSE
            errorMessage.style.display = 'none';
            form.reset();
        } else {
            const error = await response.json();
            errorMessage.textContent = 'Réservation refusée : ' + error.error;
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réservation:', error);
        errorMessage.textContent = 'Erreur de connexion au serveur.';
        errorMessage.style.display = 'block';
    }
});