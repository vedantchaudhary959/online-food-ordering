
import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// CHECKOUT ELEMENTS
// ==========================================

const checkoutItems = document.getElementById("checkout-items");
const checkoutTotal = document.getElementById("checkout-total");
const placeOrderButton = document.getElementById("place-order-btn");
const checkoutMessage = document.getElementById("checkout-message");

let currentUser = null;
let cart = [];


// ==========================================
// MESSAGE FUNCTION
// ==========================================

function showMessage(text, color = "#751D2A") {
    checkoutMessage.textContent = text;
    checkoutMessage.style.color = color;
}


// ==========================================
// LOAD CART
// ==========================================

function displayCart() {

    try {
        cart = JSON.parse(
            localStorage.getItem("abesBiteCart")
        ) || [];
    } catch (error) {
        console.error("Cart loading error:", error);
        cart = [];
    }

    checkoutItems.replaceChildren();

    if (!Array.isArray(cart) || cart.length === 0) {

        checkoutItems.textContent = "Your cart is empty.";
        checkoutTotal.textContent = "Total: ₹0";
        placeOrderButton.disabled = true;

        return;
    }

    let total = 0;

    cart.forEach((item) => {

        const price = Number(item.price);
        const quantity = Number(item.quantity);

        const itemTotal =
            Number.isFinite(price) && Number.isInteger(quantity)
                ? price * quantity
                : 0;

        total += itemTotal;

        const row = document.createElement("p");

        row.textContent =
            `${item.name} × ${quantity} = ₹${itemTotal}`;

        checkoutItems.appendChild(row);

    });

    checkoutTotal.textContent =
        "Estimated Total: ₹" + total;

    placeOrderButton.disabled = false;

}


// ==========================================
// CHECK LOGIN AND LOAD STUDENT DETAILS
// ==========================================

placeOrderButton.disabled = true;

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        currentUser = null;

        window.location.href =
            "student-login.html?returnUrl=" +
            encodeURIComponent(window.location.href);

        return;
    }

    currentUser = user;

    displayCart();

    try {

        const studentRef = doc(db, "students", user.uid);

        const studentSnapshot = await getDoc(studentRef);

        if (studentSnapshot.exists()) {

            const student = studentSnapshot.data();

            document.getElementById("student-name").value =
                student.name || user.displayName || "";

            document.getElementById("student-phone").value =
                student.phone || "";

        } else {

            document.getElementById("student-name").value =
                user.displayName || "";

            document.getElementById("student-phone").value =
                user.phoneNumber
                    ? user.phoneNumber.replace(/^\+91/, "")
                    : "";

        }

    } catch (error) {

        console.error("Student profile error:", error);

        showMessage(
            "Could not load your student details.",
            "red"
        );

    }

});


// ==========================================
// PLACE ORDER
// ==========================================

placeOrderButton.addEventListener("click", async () => {

    if (!currentUser) {

        showMessage("Please log in first.", "red");
        return;

    }


    // Student information
    const studentName =
        document.getElementById("student-name").value.trim();

    const studentPhone =
        document.getElementById("student-phone").value.trim();

    const pickupLocation =
        document.getElementById("student-location").value.trim();


    // Validate student information
    if (
        !studentName ||
        !/^[0-9]{10}$/.test(studentPhone) ||
        !pickupLocation
    ) {

        showMessage(
            "Enter your name, valid 10-digit mobile number and pickup location.",
            "red"
        );

        return;

    }


    // Load latest cart
    try {

        cart = JSON.parse(
            localStorage.getItem("abesBiteCart")
        ) || [];

    } catch (error) {

        showMessage("Your cart could not be loaded.", "red");
        return;

    }


    if (!Array.isArray(cart) || cart.length === 0) {

        showMessage("Your cart is empty.", "red");
        return;

    }


    if (cart.length > 20) {

        showMessage(
            "Your order cannot contain more than 20 items.",
            "red"
        );

        return;

    }


    // Prevent duplicate submissions
    placeOrderButton.disabled = true;

    const originalButtonText = placeOrderButton.textContent;

    placeOrderButton.textContent = "Verifying Order...";


    try {

        showMessage(
            "Verifying store and product details..."
        );


        // ======================================
        // VERIFY STORE
        // ======================================

        const storeId = cart[0].storeId;
        const storeOwnerUid = cart[0].ownerUid;


        if (
            typeof storeId !== "string" ||
            !storeId ||
            typeof storeOwnerUid !== "string" ||
            !storeOwnerUid
        ) {

            throw new Error(
                "Invalid store information. Please add your items again."
            );

        }


        // All items must belong to the same store
        if (cart.some((item) =>
            item.storeId !== storeId ||
            item.ownerUid !== storeOwnerUid
        )) {

            throw new Error(
                "Your cart contains items from different stores. Please order from one store at a time."
            );

        }


        const storeSnapshot = await getDoc(
            doc(db, "stores", storeId)
        );


        if (!storeSnapshot.exists()) {

            throw new Error(
                "This store no longer exists."
            );

        }


        const store = storeSnapshot.data();


        if (
            store.status !== "approved" ||
            store.ownerUid !== storeOwnerUid
        ) {

            throw new Error(
                "This store is not available for ordering."
            );

        }


        // ======================================
        // VERIFY PRODUCTS AND PRICES
        // ======================================

        const verifiedItems = [];

        let total = 0;


        for (const item of cart) {

            if (
                typeof item.productId !== "string" ||
                !item.productId
            ) {

                throw new Error(
                    "An item in your cart has invalid product information."
                );

            }


            const productSnapshot = await getDoc(
                doc(db, "products", item.productId)
            );


            if (!productSnapshot.exists()) {

                throw new Error(
                    (item.name || "A product") +
                    " is no longer available."
                );

            }


            const product = productSnapshot.data();


            // Check availability and ownership
            if (
                product.available !== true ||
                product.ownerUid !== storeOwnerUid
            ) {

                throw new Error(
                    (product.name || item.name) +
                    " is currently unavailable."
                );

            }


            // Use Firestore price, not browser cart price
            const price = Number(product.price);

            const quantity = Number(item.quantity);


            if (
                !Number.isFinite(price) ||
                price <= 0 ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 20
            ) {

                throw new Error(
                    "Invalid quantity or price for " +
                    (product.name || item.name)
                );

            }


            const subtotal = Math.round(
                price * quantity * 100
            ) / 100;

            total += subtotal;


            verifiedItems.push({

                productId: item.productId,

                name: product.name,

                price: price,

                quantity: quantity,

                subtotal: subtotal

            });

        }


        // ======================================
        // VALIDATE FINAL ORDER
        // ======================================

        total = Math.round(total * 100) / 100;


        if (
            verifiedItems.length === 0 ||
            verifiedItems.length > 20 ||
            !Number.isFinite(total) ||
            total <= 0 ||
            total > 5000
        ) {

            throw new Error(
                "Your order exceeds the allowed limit."
            );

        }


        // ======================================
        // GENERATE PICKUP TOKEN
        // ======================================

        const orderRef = doc(
            collection(db, "orders")
        );

        const orderToken =
            "AB-" + orderRef.id.substring(0, 6).toUpperCase();


        // ======================================
        // SAVE ORDER TO FIRESTORE
        // ======================================

        showMessage("Placing your order...");


        await setDoc(orderRef, {

            studentUid: currentUser.uid,

            studentName: studentName,

            studentPhone: studentPhone,

            pickupLocation: pickupLocation,

            storeId: storeId,

            storeOwnerUid: storeOwnerUid,

            storeName: store.storeName,

            items: verifiedItems,

            total: total,

            orderToken: orderToken,

            status: "Pending",

            createdAt: serverTimestamp()

        });


        // ======================================
        // CLEAR CART AFTER SUCCESSFUL ORDER
        // ======================================

        localStorage.removeItem("abesBiteCart");

        cart = [];

        checkoutItems.replaceChildren();

        checkoutItems.textContent =
            "Your order has been placed successfully!";


        checkoutTotal.textContent =
            "Total: ₹" + total;


        showMessage(
            "Order placed successfully! Your pickup token is: " +
            orderToken,
            "green"
        );


        placeOrderButton.textContent = "Order Placed";

        placeOrderButton.disabled = true;


    } catch (error) {

        console.error(
            "Order placement error:",
            error
        );


        showMessage(
            error.message || "Could not place your order.",
            "red"
        );


        placeOrderButton.disabled = false;

        placeOrderButton.textContent = originalButtonText;

    }

});
