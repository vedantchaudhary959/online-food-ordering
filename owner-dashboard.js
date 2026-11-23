
import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ==========================================
// PICKUP TOKEN STYLING
// ==========================================

const tokenStyle = document.createElement("style");

tokenStyle.textContent = `
    .pickup-token {
        background: #FFF9EC;
        color: #751D2A;
        border: 2px solid #E5B817;
        border-radius: 8px;
        padding: 14px;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        letter-spacing: 1px;
        margin-bottom: 15px;
    }
`;

document.head.appendChild(tokenStyle);


// ==========================================
// DASHBOARD ELEMENTS
// ==========================================

const storeNameElement = document.getElementById("storeName");
const storeStatusElement = document.getElementById("storeStatus");
const totalItemsElement = document.getElementById("totalItems");
const totalOrdersElement = document.getElementById("totalOrders");
const storeInformation = document.getElementById("storeInformation");
const message = document.getElementById("ownerDashboardMessage");

const foodForm = document.getElementById("addFoodForm");
const foodMessage = document.getElementById("foodMessage");
const foodItemsList = document.getElementById("foodItemsList");
const ownerOrdersList = document.getElementById("ownerOrdersList");
const orderMessage = document.getElementById("orderMessage");

let currentUser = null;
let editingProductId = null;


// ==========================================
// MESSAGE FUNCTIONS
// ==========================================

function showMessage(text, color = "#751D2A") {
    message.textContent = text;
    message.style.color = color;
}

function showFoodMessage(text, color = "#751D2A") {
    foodMessage.textContent = text;
    foodMessage.style.color = color;
}

function showOrderMessage(text, color = "#751D2A") {
    orderMessage.textContent = text;
    orderMessage.style.color = color;
}


// ==========================================
// CREATE HTML ELEMENTS SAFELY
// ==========================================

function createTextElement(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}


// ==========================================
// LOAD FOOD ITEMS
// ==========================================

async function loadFoodItems() {

    const productsQuery = query(
        collection(db, "products"),
        where("ownerUid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(productsQuery);

    totalItemsElement.textContent = snapshot.size;
    foodItemsList.replaceChildren();

    if (snapshot.empty) {
        foodItemsList.textContent = "No food items added yet.";
        return;
    }

    snapshot.forEach((productDocument) => {

        const product = productDocument.data();
        const productId = productDocument.id;

        const card = document.createElement("div");
        card.className = "owner-item";

        card.appendChild(
            createTextElement("h3", product.name || "Food Item")
        );

        card.appendChild(
            createTextElement("p", "Price: ₹" + product.price)
        );

        card.appendChild(
            createTextElement("p", "Category: " + (product.category || "Other"))
        );

        card.appendChild(
            createTextElement("p", "Description: " + (product.description || "None"))
        );

        card.appendChild(
            createTextElement(
                "p",
                "Availability: " +
                (product.available === false ? "Unavailable" : "Available")
            )
        );


        // Edit button
        const editButton = document.createElement("button");
        editButton.className = "owner-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editFoodItem(productId, product);
        });


        // Availability button
        const availabilityButton = document.createElement("button");
        availabilityButton.className = "owner-btn";

        availabilityButton.textContent =
            product.available === false
                ? "Make Available"
                : "Mark Unavailable";

        availabilityButton.addEventListener("click", () => {
            changeAvailability(productId, product.available !== false);
        });


        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.className = "owner-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            removeFoodItem(productId);
        });


        card.append(editButton, availabilityButton, deleteButton);
        foodItemsList.appendChild(card);

    });
}


// ==========================================
// ADD OR UPDATE FOOD ITEM
// ==========================================

foodForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser) return;

    const name = document.getElementById("foodName").value.trim();
    const price = Number(document.getElementById("foodPrice").value);
    const category = document.getElementById("foodCategory").value;
    const imageUrl = document.getElementById("foodImage").value.trim();
    const description = document.getElementById("foodDescription").value.trim();


    if (!name || !Number.isFinite(price) || price <= 0 || !category) {

        showFoodMessage(
            "Please enter a valid name, price and category.",
            "#B42318"
        );

        return;
    }


    const button = foodForm.querySelector('button[type="submit"]');
    button.disabled = true;


    try {

        const productData = {
            name,
            price,
            category,
            imageUrl,
            description,
            ownerUid: currentUser.uid,
            storeName: storeNameElement.textContent,
            updatedAt: serverTimestamp()
        };


        if (editingProductId) {

            await updateDoc(
                doc(db, "products", editingProductId),
                productData
            );

            showFoodMessage(
                "Food item updated successfully.",
                "#187438"
            );

            editingProductId = null;
            button.textContent = "Add Food Item";

        } else {

            await addDoc(collection(db, "products"), {
                ...productData,
                available: true,
                createdAt: serverTimestamp()
            });

            showFoodMessage(
                "Food item added successfully.",
                "#187438"
            );

        }


        foodForm.reset();
        await loadFoodItems();

    } catch (error) {

        console.error("Food item error:", error);

        showFoodMessage(
            "Could not save food item. Check Firebase permissions.",
            "#B42318"
        );

    } finally {

        button.disabled = false;

    }

});


// ==========================================
// EDIT FOOD ITEM
// ==========================================

function editFoodItem(productId, product) {

    editingProductId = productId;

    document.getElementById("foodName").value = product.name || "";
    document.getElementById("foodPrice").value = product.price || "";
    document.getElementById("foodCategory").value = product.category || "";
    document.getElementById("foodImage").value = product.imageUrl || "";
    document.getElementById("foodDescription").value = product.description || "";

    foodForm.querySelector('button[type="submit"]').textContent = "Save Changes";

    showFoodMessage("Editing: " + product.name);

    foodForm.scrollIntoView({ behavior: "smooth" });

}


// ==========================================
// CHANGE FOOD AVAILABILITY
// ==========================================

async function changeAvailability(productId, currentlyAvailable) {

    try {

        await updateDoc(doc(db, "products", productId), {
            available: !currentlyAvailable,
            updatedAt: serverTimestamp()
        });

        showFoodMessage(
            "Food availability updated.",
            "#187438"
        );

        await loadFoodItems();

    } catch (error) {

        console.error("Availability error:", error);

        showFoodMessage(
            "Could not update availability. Check Firebase permissions.",
            "#B42318"
        );

    }

}


// ==========================================
// DELETE FOOD ITEM
// ==========================================

async function removeFoodItem(productId) {

    if (!confirm("Are you sure you want to delete this food item?")) {
        return;
    }

    try {

        await deleteDoc(doc(db, "products", productId));

        showFoodMessage(
            "Food item deleted successfully.",
            "#187438"
        );

        await loadFoodItems();

    } catch (error) {

        console.error("Delete food error:", error);

        showFoodMessage(
            "Could not delete food item. Check Firebase permissions.",
            "#B42318"
        );

    }

}


// ==========================================
// LOAD ORDERS IN REAL TIME
// ==========================================

function loadOrders() {

    const ordersQuery = query(
        collection(db, "orders"),
        where("storeOwnerUid", "==", currentUser.uid)
    );


    onSnapshot(ordersQuery, (snapshot) => {

        totalOrdersElement.textContent = snapshot.size;
        ownerOrdersList.replaceChildren();

        if (snapshot.empty) {

            ownerOrdersList.textContent = "No orders received yet.";
            return;

        }


        snapshot.forEach((orderDocument) => {

            const order = orderDocument.data();
            const orderId = orderDocument.id;

            const card = document.createElement("div");
            card.className = "owner-item";


            // HIGHLIGHTED PICKUP TOKEN
            const tokenHeading = createTextElement(
                "h3",
                "PICKUP TOKEN: " + (order.orderToken || orderId)
            );

            tokenHeading.className = "pickup-token";

            card.appendChild(tokenHeading);


            // Student details
            card.appendChild(
                createTextElement(
                    "p",
                    "Student: " + (order.studentName || "N/A")
                )
            );

            card.appendChild(
                createTextElement(
                    "p",
                    "Phone: " + (order.studentPhone || "N/A")
                )
            );

            card.appendChild(
                createTextElement(
                    "p",
                    "Pickup Location: " + (order.pickupLocation || "N/A")
                )
            );


            // Ordered items
            card.appendChild(
                createTextElement(
                    "p",
                    "Items: " +
                    (order.items || []).map(item =>
                        `${item.name} × ${item.quantity}`
                    ).join(", ")
                )
            );


            // Total amount
            card.appendChild(
                createTextElement(
                    "p",
                    "Total: ₹" + order.total
                )
            );


            // Current status
            card.appendChild(
                createTextElement(
                    "p",
                    "Status: " + (order.status || "Pending")
                )
            );


            // Status dropdown
            const statusSelect = document.createElement("select");

            [
                "Pending",
                "Preparing",
                "Ready for Pickup",
                "Completed"
            ].forEach((status) => {

                const option = document.createElement("option");

                option.value = status;
                option.textContent = status;

                statusSelect.appendChild(option);

            });

            statusSelect.value = order.status || "Pending";


            // Update status button
            const updateButton = document.createElement("button");

            updateButton.className = "owner-btn";
            updateButton.textContent = "Update Order Status";


            updateButton.addEventListener("click", async () => {

                try {

                    updateButton.disabled = true;

                    await updateDoc(
                        doc(db, "orders", orderId),
                        {
                            status: statusSelect.value
                        }
                    );

                    showOrderMessage(
                        "Order status updated successfully.",
                        "#187438"
                    );

                } catch (error) {

                    console.error("Order update error:", error);

                    showOrderMessage(
                        "Could not update order status.",
                        "#B42318"
                    );

                } finally {

                    updateButton.disabled = false;

                }

            });


            card.append(statusSelect, updateButton);

            ownerOrdersList.appendChild(card);

        });

    }, (error) => {

        console.error("Orders loading error:", error);

        showOrderMessage(
            "Could not load orders. Check the error in your browser Console.",
            "#B42318"
        );

    });

}


// ==========================================
// VERIFY OWNER LOGIN AND STORE APPROVAL
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.replace("owner-login.html");
        return;

    }

    currentUser = user;


    try {

        const applicationRef = doc(
            db,
            "storeApplications",
            user.uid
        );

        const applicationSnapshot = await getDoc(applicationRef);


        if (!applicationSnapshot.exists()) {

            showMessage(
                "No store registration was found.",
                "#B42318"
            );

            return;

        }


        const store = applicationSnapshot.data();


        if (store.status !== "approved") {

            storeStatusElement.textContent = store.status || "Pending";

            showMessage(
                "Your store is not approved yet.",
                "#B42318"
            );

            return;

        }


        storeNameElement.textContent = store.storeName || "My Store";
        storeStatusElement.textContent = "Approved";


        // Store information
        storeInformation.replaceChildren();

        const details = [
            ["Owner", store.ownerName],
            ["Store", store.storeName],
            ["Category", store.category],
            ["Location", store.location],
            ["Description", store.description]
        ];


        details.forEach(([label, value]) => {

            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = label + ": ";

            paragraph.append(
                strong,
                document.createTextNode(value || "Not provided")
            );

            storeInformation.appendChild(paragraph);

        });


        // Load food items and orders
        await loadFoodItems();

        loadOrders();


        showMessage(
            "Store dashboard loaded successfully.",
            "#187438"
        );


    } catch (error) {

        console.error("Owner dashboard error:", error);

        showMessage(
            "Could not load dashboard. Check the error in your browser Console.",
            "#B42318"
        );

    }

});


// ==========================================
// LOGOUT
// ==========================================

document.getElementById("ownerLogout").addEventListener("click", async () => {

    await signOut(auth);

    window.location.replace("owner-login.html");

});
