
import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const ordersList = document.getElementById("orders-list");
const ordersMessage = document.getElementById("orders-message");
const notificationArea = document.getElementById("notification-area");

let previousStatuses = new Map();
let firstSnapshot = true;


// Display notification to student
function showNotification(message) {

    notificationArea.replaceChildren();

    const notification = document.createElement("div");
    notification.className = "order-notification";
    notification.textContent = message;

    notificationArea.appendChild(notification);
}


// Get notification message according to order status
function getStatusMessage(status) {

    if (status === "Preparing") {
        return "Your order is now being prepared!";
    }

    if (status === "Ready for Pickup") {
        return "Your order is ready! Please collect it from your store.";
    }

    if (status === "Completed") {
        return "Your order has been completed. Thank you for ordering!";
    }

    return null;
}


// Check student login
onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href =
            "student-login.html?returnUrl=" +
            encodeURIComponent("my-orders.html");
        return;
    }

    const ordersQuery = query(
        collection(db, "orders"),
        where("studentUid", "==", user.uid)
    );


    // Listen for real-time order changes
    onSnapshot(ordersQuery, (snapshot) => {

        ordersList.replaceChildren();

        if (snapshot.empty) {
            ordersMessage.textContent =
                "You have not placed any orders yet.";

            previousStatuses.clear();
            firstSnapshot = false;
            return;
        }

        ordersMessage.textContent =
            "Your orders are updated automatically.";

        const currentStatuses = new Map();

        snapshot.forEach((orderDoc) => {

            const order = orderDoc.data();
            const orderId = orderDoc.id;
            const currentStatus = order.status || "Pending";

            currentStatuses.set(orderId, currentStatus);

            // Notify student when an existing order status changes
            if (!firstSnapshot && previousStatuses.has(orderId)) {

                const oldStatus = previousStatuses.get(orderId);

                if (oldStatus !== currentStatus) {

                    const message = getStatusMessage(currentStatus);

                    if (message) {
                        showNotification(message);
                    }
                }
            }

            // Create order card
            const card = document.createElement("div");
            card.className = "order-card";

            const heading = document.createElement("h3");
            heading.textContent =
                order.storeName || "ABES.BITE Store";

            const token = document.createElement("p");
            token.textContent =
    "Pickup Token: " + (order.orderToken || orderId);

            const status = document.createElement("p");
            status.className = "order-status";
            status.textContent = currentStatus;

// Create visual order progress tracker

const progressContainer = document.createElement("div");
progressContainer.className = "order-progress";

const progressStages = [
    "Order Placed",
    "Preparing",
    "Ready for Pickup",
    "Completed"
];

const statusIndex = {
    "Pending": 0,
    "Preparing": 1,
    "Ready for Pickup": 2,
    "Completed": 3
};

const currentStage = statusIndex[currentStatus] ?? 0;

progressStages.forEach((stage, index) => {

    const step = document.createElement("div");
    step.className = "progress-step";

    if (index < currentStage) {
        step.classList.add("completed");
    } else if (index === currentStage) {
        step.classList.add("active");
    }

    const circle = document.createElement("div");
    circle.className = "progress-circle";
    circle.textContent = index < currentStage ? "✓" : index + 1;

    const label = document.createElement("span");
    label.textContent = stage;

    step.append(circle, label);
    progressContainer.appendChild(step);

});


            const itemsHeading = document.createElement("p");
            itemsHeading.textContent = "Items:";

            const itemsList = document.createElement("ul");

            (order.items || []).forEach((item) => {

                const listItem = document.createElement("li");

                listItem.textContent =
                    `${item.name} × ${item.quantity}`;

                itemsList.appendChild(listItem);
            });

            const total = document.createElement("p");
            total.textContent = "Total: ₹" + order.total;

            const pickup = document.createElement("p");
            pickup.textContent =
                "Pickup Location: " +
                (order.pickupLocation || "Not specified");

            card.append(
    heading,
    token,
    status,
    progressContainer,
    itemsHeading,
    itemsList,
    total,
    pickup
);

            ordersList.appendChild(card);

        });

        previousStatuses = currentStatuses;
        firstSnapshot = false;

    }, (error) => {

        console.error("Error loading orders:", error);

        ordersMessage.textContent =
            "Unable to load orders. Please try again.";

    });

});
