
import { auth } from "./firebase.js";
import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const cartStoreName = document.getElementById("cart-store-name");
const checkoutButton = document.getElementById("checkout-btn");
const cartMessage = document.getElementById("cart-message");

let cart = [];

function loadCart() {
    cart = JSON.parse(localStorage.getItem("abesBiteCart")) || [];
    renderCart();
}

function saveCart() {
    localStorage.setItem("abesBiteCart", JSON.stringify(cart));
}

function renderCart() {
    cartItemsContainer.replaceChildren();

    if (cart.length === 0) {
        cartItemsContainer.textContent = "Your cart is empty.";
        cartTotal.textContent = "₹0";
        cartStoreName.textContent = "";
        checkoutButton.disabled = true;
        return;
    }

    cartStoreName.textContent = "Store: " + cart[0].storeName;

    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        total += itemTotal;

        const card = document.createElement("div");
        card.className = "food-card";

        const name = document.createElement("h3");
        name.textContent = item.name;

        const price = document.createElement("p");
        price.textContent = "Price: ₹" + item.price;

        const quantity = document.createElement("p");
        quantity.textContent = "Quantity: " + item.quantity;

        const decrease = document.createElement("button");
        decrease.textContent = "−";
        decrease.addEventListener("click", () => {
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                cart.splice(index, 1);
            }

            saveCart();
            renderCart();
        });

        const increase = document.createElement("button");
        increase.textContent = "+";
        increase.addEventListener("click", () => {
            item.quantity++;
            saveCart();
            renderCart();
        });

        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            cart.splice(index, 1);
            saveCart();
            renderCart();
        });

        card.append(name, price, quantity, decrease, increase, remove);
        cartItemsContainer.appendChild(card);
    });

    cartTotal.textContent = "₹" + total;
    checkoutButton.disabled = false;
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href =
            "student-login.html?returnUrl=" +
            encodeURIComponent(window.location.href);
        return;
    }

    loadCart();
});

checkoutButton.addEventListener("click", () => {
    if (cart.length === 0) {
        cartMessage.textContent = "Your cart is empty.";
        return;
    }

    window.location.href = "checkout.html";
});