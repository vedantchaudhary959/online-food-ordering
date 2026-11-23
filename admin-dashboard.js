
import { auth, db } from "./firebase.js";

import {
    collection,
    onSnapshot,
    doc,
    writeBatch,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ==========================================
// DASHBOARD ELEMENTS
// ==========================================

const applicationsList = document.getElementById("applicationsList");
const message = document.getElementById("dashboardMessage");

let applications = [];
let orders = [];

let unsubscribeApplications = null;
let unsubscribeOrders = null;


// ==========================================
// DASHBOARD STYLING
// ==========================================

const adminStyle = document.createElement("style");

adminStyle.textContent = `
    .admin-extra-section {
        margin: 30px 0;
        padding: 22px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.07);
        overflow-x: auto;
    }

    .admin-extra-section h2 {
        color: #751D2A;
        margin-bottom: 18px;
    }

    .admin-extra-section table {
        width: 100%;
        border-collapse: collapse;
        min-width: 650px;
    }

    .admin-extra-section th,
    .admin-extra-section td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }

    .admin-extra-section th {
        background: #751D2A;
        color: white;
    }

    .admin-extra-section tr:hover {
        background: #FFF9EC;
    }

    .admin-stat-boxes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin: 20px 0;
    }

    .admin-stat-card {
        background: #FFF9EC;
        border-left: 4px solid #E5B817;
        border-radius: 8px;
        padding: 16px;
    }

    .admin-stat-card p {
        margin: 0 0 8px;
        color: #555;
    }

    .admin-stat-card strong {
        font-size: 25px;
        color: #751D2A;
    }

    .admin-status {
        font-weight: bold;
        color: #751D2A;
    }

    .admin-action-button {
        padding: 8px 12px;
        background: #751D2A;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    .admin-action-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

document.head.appendChild(adminStyle);


// ==========================================
// CREATE ORDER MONITORING SECTION
// ==========================================

function createOrderMonitoringSection() {

    let section = document.getElementById("adminOrdersSection");

    if (section) return section;

    section = document.createElement("section");
    section.id = "adminOrdersSection";
    section.className = "admin-extra-section";

    section.innerHTML = `
        <h2>Platform Order Monitoring</h2>

        <div class="admin-stat-boxes">
            <div class="admin-stat-card">
                <p>Total Orders</p>
                <strong id="adminTotalOrders">0</strong>
            </div>

            <div class="admin-stat-card">
                <p>Pending Orders</p>
                <strong id="adminPendingOrders">0</strong>
            </div>

            <div class="admin-stat-card">
                <p>Preparing Orders</p>
                <strong id="adminPreparingOrders">0</strong>
            </div>

            <div class="admin-stat-card">
                <p>Ready for Pickup</p>
                <strong id="adminReadyOrders">0</strong>
            </div>

            <div class="admin-stat-card">
                <p>Completed Orders</p>
                <strong id="adminCompletedOrders">0</strong>
            </div>
        </div>

        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>
                        <th>Pickup Token</th>
                        <th>Student</th>
                        <th>Store</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody id="adminOrdersList">
                    <tr>
                        <td colspan="5">Loading orders...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    if (applicationsList) {
        const applicationSection =
            applicationsList.closest("section") ||
            applicationsList.parentElement;

        if (applicationSection && applicationSection.parentElement) {
            applicationSection.parentElement.appendChild(section);
        } else {
            document.body.appendChild(section);
        }
    } else {
        document.body.appendChild(section);
    }

    return section;
}


// ==========================================
// MESSAGE FUNCTION
// ==========================================

function showMessage(text, color = "#751D2A") {

    if (!message) return;

    message.textContent = text;
    message.style.color = color;

}


// ==========================================
// APPLICATION STATISTICS
// ==========================================

function updateStatistics() {

    const pending = applications.filter(
        app => app.status === "pending"
    ).length;

    const approved = applications.filter(
        app => app.status === "approved"
    ).length;

    const rejected = applications.filter(
        app => app.status === "rejected"
    ).length;

    const pendingElement =
        document.getElementById("pendingApplications");

    const approvedElement =
        document.getElementById("approvedStores");

    const totalElement =
        document.getElementById("totalStores");

    if (pendingElement) pendingElement.textContent = pending;

    if (approvedElement) approvedElement.textContent = approved;

    if (totalElement) totalElement.textContent = approved;

}


// ==========================================
// RENDER STORE APPLICATIONS
// ==========================================

function renderApplications() {

    applicationsList.replaceChildren();

    if (applications.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent =
            "No store applications have been submitted yet.";

        row.appendChild(cell);
        applicationsList.appendChild(row);

        return;
    }


    applications.forEach(app => {

        const row = document.createElement("tr");

        const values = [
            app.ownerName || "Not provided",
            app.storeName || "Not provided",
            app.category || "Not provided",
            app.location || "Not provided",
            app.status || "Unknown"
        ];


        values.forEach((value, index) => {

            const cell = document.createElement("td");

            cell.textContent = value;

            if (index === 4) {
                cell.className = "status-" + value.toLowerCase();
            }

            row.appendChild(cell);

        });


        const actionCell = document.createElement("td");


        if (app.status === "pending") {

            const approveButton = document.createElement("button");

            approveButton.textContent = "Approve";
            approveButton.className = "approve-btn";

            approveButton.addEventListener("click", () => {
                updateApplicationStatus(app.id, "approved");
            });


            const rejectButton = document.createElement("button");

            rejectButton.textContent = "Reject";
            rejectButton.className = "reject-btn";

            rejectButton.addEventListener("click", () => {
                updateApplicationStatus(app.id, "rejected");
            });


            actionCell.append(approveButton, rejectButton);

        } else {

            actionCell.textContent = "No action available";

        }


        row.appendChild(actionCell);

        applicationsList.appendChild(row);

    });

}


// ==========================================
// APPROVE OR REJECT APPLICATION
// ==========================================

async function updateApplicationStatus(applicationId, newStatus) {

    const confirmed = window.confirm(
        `Are you sure you want to ${newStatus} this application?`
    );

    if (!confirmed) return;


    const app = applications.find(
        item => item.id === applicationId
    );

    if (!app) {

        showMessage("Application not found.", "#B42318");
        return;

    }


    try {

        const batch = writeBatch(db);

        const applicationRef = doc(
            db,
            "storeApplications",
            applicationId
        );

        const storeRef = doc(
            db,
            "stores",
            applicationId
        );


        batch.update(applicationRef, {

            status: newStatus,

            reviewedAt: serverTimestamp(),

            reviewedBy: auth.currentUser.uid

        });


        if (newStatus === "approved") {

            batch.set(storeRef, {

                ownerUid: applicationId,

                storeName: app.storeName || "",

                category: app.category || "",

                location: app.location || "",

                description: app.description || "",

                status: "approved",

                createdAt: app.createdAt || null,

                approvedAt: serverTimestamp()

            });

        } else {

            batch.delete(storeRef);

        }


        await batch.commit();


        showMessage(
            `Application ${newStatus} successfully.`,
            "#187438"
        );


    } catch (error) {

        console.error("Application update error:", error);

        showMessage(
            "Could not update the application. Check Firebase permissions.",
            "#B42318"
        );

    }

}


// ==========================================
// UPDATE ORDER STATISTICS
// ==========================================

function updateOrderStatistics() {

    const total = orders.length;

    const pending = orders.filter(
        order => order.status === "Pending"
    ).length;

    const preparing = orders.filter(
        order => order.status === "Preparing"
    ).length;

    const ready = orders.filter(
        order => order.status === "Ready for Pickup"
    ).length;

    const completed = orders.filter(
        order => order.status === "Completed"
    ).length;


    document.getElementById("adminTotalOrders").textContent = total;

    document.getElementById("adminPendingOrders").textContent = pending;

    document.getElementById("adminPreparingOrders").textContent = preparing;

    document.getElementById("adminReadyOrders").textContent = ready;

    document.getElementById("adminCompletedOrders").textContent = completed;

}


// ==========================================
// RENDER ALL PLATFORM ORDERS
// ==========================================

function renderOrders() {

    const ordersList = document.getElementById("adminOrdersList");

    ordersList.replaceChildren();


    if (orders.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No orders have been placed yet.";

        row.appendChild(cell);
        ordersList.appendChild(row);

        return;

    }


    orders.forEach(order => {

        const row = document.createElement("tr");


        const values = [
            order.orderToken || order.id,
            order.studentName || "N/A",
            order.storeName || "N/A",
            "₹" + (order.total ?? 0),
            order.status || "Pending"
        ];


        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });


        ordersList.appendChild(row);

    });

}


// ==========================================
// REAL-TIME ORDER MONITORING
// ==========================================

function loadAllOrders() {

    unsubscribeOrders = onSnapshot(

        collection(db, "orders"),

        snapshot => {

            orders = snapshot.docs.map(orderDocument => ({

                id: orderDocument.id,

                ...orderDocument.data()

            }));


            orders.sort((a, b) => {

                const timeA = a.createdAt?.toMillis?.() || 0;

                const timeB = b.createdAt?.toMillis?.() || 0;

                return timeB - timeA;

            });


            updateOrderStatistics();

            renderOrders();

        },

        error => {

            console.error("Order monitoring error:", error);

            const ordersList =
                document.getElementById("adminOrdersList");

            ordersList.textContent =
                "Unable to load orders. Check Firestore permissions.";

        }

    );

}


// ==========================================
// VERIFY ADMINISTRATOR ACCESS
// ==========================================

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.replace("admin-login.html");
        return;

    }


    try {

        const tokenResult = await user.getIdTokenResult(true);


        if (tokenResult.claims.admin !== true) {

            await signOut(auth);

            window.location.replace("admin-login.html");

            return;

        }


        // Create order monitoring interface
        createOrderMonitoringSection();


        // Load applications in real time
        unsubscribeApplications = onSnapshot(

            collection(db, "storeApplications"),

            snapshot => {

                applications = snapshot.docs.map(applicationDocument => ({

                    id: applicationDocument.id,

                    ...applicationDocument.data()

                }));


                applications.sort((a, b) => {

                    const timeA = a.createdAt?.toMillis?.() || 0;

                    const timeB = b.createdAt?.toMillis?.() || 0;

                    return timeB - timeA;

                });


                updateStatistics();

                renderApplications();

                showMessage(
                    "Admin dashboard loaded successfully.",
                    "#187438"
                );

            },

            error => {

                console.error("Application loading error:", error);

                showMessage(
                    "Unable to load applications. Check Firestore permissions.",
                    "#B42318"
                );

            }

        );


        // Load all orders in real time
        loadAllOrders();


    } catch (error) {

        console.error("Admin verification error:", error);

        await signOut(auth);

        window.location.replace("admin-login.html");

    }

});


// ==========================================
// ADMIN LOGOUT
// ==========================================

document.getElementById("adminLogout").addEventListener(
    "click",
    async event => {

        event.preventDefault();

        try {

            if (unsubscribeApplications) {
                unsubscribeApplications();
            }

            if (unsubscribeOrders) {
                unsubscribeOrders();
            }

            await signOut(auth);

            window.location.replace("admin-login.html");

        } catch (error) {

            console.error("Logout error:", error);

            showMessage(
                "Could not log out. Please try again.",
                "#B42318"
            );

        }

    }
);
