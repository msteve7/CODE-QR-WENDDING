let db;

const request = indexedDB.open("guestDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    db.createObjectStore("guests", { keyPath: "id" });
};

request.onsuccess = function(event) {
    db = event.target.result;
};

document.getElementById("addGuestButton").addEventListener("click", addGuest);

function addGuest() {
    const guestName = document.getElementById("guestName").value.trim();
    const tableName = document.getElementById("tableName").value.trim();

    if (!guestName || !tableName) {
        alert("Veuillez entrer le nom de l'invité et le nom de la table !");
        return;
    }

    const guest = {
        id: Date.now(),
        name: guestName,
        table: tableName,
        checkedIn: false
    };

    const transaction = db.transaction(["guests"], "readwrite");
    const store = transaction.objectStore("guests");
    
    store.add(guest);
    
    document.getElementById("guestName").value = "";
    document.getElementById("tableName").value = "";
    
    loadGuests();
}

function loadGuests() {
    const guestList = document.getElementById("guestList");
    
    // Vider la liste actuelle
    guestList.innerHTML = "";

    const transaction = db.transaction(["guests"], "readonly");
    const store = transaction.objectStore("guests");

    store.getAll().onsuccess = function(event) {
        const guests = event.target.result;

        guests.forEach(guest => {
            const li = document.createElement("li");
            li.textContent = `${guest.name} (Table : ${guest.table})`;

            if (guest.checkedIn) {
                li.classList.add("completed");
            }

            // Créer un bouton pour marquer comme présent
            const checkInButton = document.createElement("button");
            checkInButton.textContent = "✔️";
            checkInButton.addEventListener("click", function() {
                toggleCheckIn(guest.id);
            });

            // Créer un bouton pour générer le QR code
            const qrButton = document.createElement("button");
            qrButton.textContent = "QR Code";
            qrButton.addEventListener("click", function() {
                generateQRCode(guest);
            });

            li.appendChild(checkInButton);
            li.appendChild(qrButton);
            guestList.appendChild(li);
        });
    };
}

function toggleCheckIn(id) {
    const transaction = db.transaction(["guests"], "readwrite");
    const store = transaction.objectStore("guests");

    store.get(id).onsuccess = function(event) {
        const guest = event.target.result;
        guest.checkedIn = !guest.checkedIn; // Inverser l'état de présence
        store.put(guest); // Mettre à jour l'invité
        loadGuests(); // Recharger les invités
    };
}

function generateQRCode(guest) {
   $('#qrCodeContainer').empty(); // Vider le conteneur précédent
   $('#qrCodeContainer').qrcode({
       text: JSON.stringify({ name: guest.name, table: guest.table }),
       width: 128,
       height: 128
   });
}

// Scanner le QR Code
const html5QrCode = new Html5Qrcode("reader");

document.getElementById("startScanButton").addEventListener("click", () => {
   html5QrCode.start(
       { facingMode: "environment" }, 
       { fps: 10, qrbox: { width: 250, height: 250 } },
       (decodedText, decodedResult) => {
           // Lorsque le QR Code est scanné avec succès
           const data = JSON.parse(decodedText);
           validateGuest(data.name);
           html5QrCode.stop(); // Arrêter le scanner après lecture
       },
       (errorMessage) => { 
           // Erreur lors du scan
           console.warn(`QR code scan error : ${errorMessage}`);
       })
   .catch(err => { 
       console.error(`Unable to start scanning, error : ${err}`);
   });
});

function validateGuest(name) {
   const transaction = db.transaction(["guests"], "readonly");
   const store = transaction.objectStore("guests");

   store.getAll().onsuccess = function(event) {
       const guests = event.target.result;

       guests.forEach(guest => {
           if (guest.name === name) {
               alert(`${name} est validé !`);
               toggleCheckIn(guest.id); // Marquer comme présent
           }
       });
   };
}