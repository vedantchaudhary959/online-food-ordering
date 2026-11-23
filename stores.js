
import { db } from "./firebase.js";

import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const storesContainer = document.querySelector(".store-placeholder");

const storesQuery = query(
    collection(db, "stores"),
    where("status", "==", "approved")
);

onSnapshot(storesQuery, (snapshot) => {
    storesContainer.innerHTML = "";

    if (snapshot.empty) {
        storesContainer.innerHTML = `
            <div class="store-placeholder-icon">🏪</div>
            <h3>Something Delicious Is Coming!</h3>
            <p>Campus cafes and shops will appear here once they register and get approved.</p>
        `;
        return;
    }

  snapshot.forEach((storeDoc) => {
    const store = storeDoc.data();

    const card = document.createElement("div");
        card.className = "store-card";
        card.style.cursor = "pointer";

card.addEventListener("click", () => {
    window.location.href = `store-menu.html?storeId=${storeDoc.id}`;
});

        const name = document.createElement("h3");
        name.textContent = store.storeName || "Campus Store";

        const category = document.createElement("p");
        category.textContent = store.category || "Food Store";

        const location = document.createElement("p");
        location.textContent = store.location || "ABES Campus";

        const description = document.createElement("p");
        description.textContent = store.description || "";

        card.append(name, category, location, description);
        storesContainer.appendChild(card);
    });

}, (error) => {
    console.error("Store loading error:", error);
    storesContainer.textContent = "Unable to load stores. Please try again.";
});
