import { saveOrder } from "./firebase.js";
// 1. Outlet and food menu data

const outlets = {
    "GAURI CAFE": [
        { id: 1, name: "Veg Sandwich", description: "Fresh vegetable sandwich", price: 50 },
        { id: 2, name: "Veg Burger", description: "Burger with fresh vegetables", price: 60 },
        { id: 3, name: "French Fries", description: "Crispy potato fries", price: 70 },
        { id: 4, name: "Cold Coffee", description: "Chilled coffee", price: 60 }
    ],

    "TEA MEN'S CAFE": [
        { id: 5, name: "Masala Tea", description: "Hot Indian masala tea", price: 20 },
        { id: 6, name: "Coffee", description: "Fresh hot coffee", price: 30 },
        { id: 7, name: "Veg Maggi", description: "Hot and tasty Maggi", price: 40 },
        { id: 8, name: "Samosa", description: "Crispy potato samosa", price: 20 }
    ],

    "Cafe 1": [
        { id: 9, name: "Cheese Sandwich", description: "Grilled cheese sandwich", price: 60 },
        { id: 10, name: "Pasta", description: "Creamy white sauce pasta", price: 90 }
    ],

    "Cafe 2": [
        { id: 11, name: "Veg Momos", description: "Steamed vegetable momos", price: 60 },
        { id: 12, name: "Noodles", description: "Vegetable noodles", price: 80 }
    ],

    "Juice Corner": [
        { id: 13, name: "Orange Juice", description: "Fresh orange juice", price: 50 },
        { id: 14, name: "Mango Shake", description: "Refreshing mango shake", price: 70 }
    ]
};


// 2. Store the current outlet and cart

let selectedOutlet = null;
let cart = [];


// 3. Display all outlets on the website

const outletList = document.getElementById("outlet-list");

Object.keys(outlets).forEach(function(outletName) {

    const card = document.createElement("div");
    card.className = "outlet-card";

    card.innerHTML = `
        <h3>${outletName}</h3>
        <p>Click to explore the menu</p>
    `;

    card.addEventListener("click", function() {
        selectOutlet(outletName);
    });

    outletList.appendChild(card);
});


// 4. Select an outlet and display its menu

function selectOutlet(outletName) {

    if (cart.length > 0 && selectedOutlet !== outletName) {
        const confirmChange = confirm(
            "Changing outlets will clear your current cart. Continue?"
        );

        if (!confirmChange) return;

        cart = [];
        document.getElementById("order-message").textContent = "";
        updateCart();
    }

    selectedOutlet = outletName;

    document.getElementById("menu-title").textContent = outletName;
    document.getElementById("menu-subtitle").textContent =
        "Choose your favourite food.";

    document.querySelectorAll(".outlet-card").forEach(function(card) {
        card.classList.toggle(
            "active",
            card.querySelector("h3").textContent === outletName
        );
    });

    displayMenu();
}


// 5. Display food items

function displayMenu() {

    const menuList = document.getElementById("menu-list");
    menuList.innerHTML = "";

    outlets[selectedOutlet].forEach(function(food) {

        const foodCard = document.createElement("div");
        foodCard.className = "food-card";

        foodCard.innerHTML = `
            <h3>${food.name}</h3>
            <p>${food.description}</p>

            <div class="food-bottom">
                <strong>₹${food.price}</strong>
                <button>Add to Cart</button>
            </div>
        `;

        foodCard.querySelector("button").addEventListener("click", function() {
            addToCart(food);
        });

        menuList.appendChild(foodCard);
    });
}


// 6. Add food to cart

function addToCart(food) {

    const existingItem = cart.find(function(item) {
        return item.id === food.id;
    });

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...food,
            quantity: 1
        });
    }

    document.getElementById("order-message").textContent = "";
    updateCart();
}


// 7. Increase or decrease food quantity

function changeQuantity(foodId, change) {

    const item = cart.find(function(food) {
        return food.id === foodId;
    });

    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(function(food) {
            return food.id !== foodId;
        });
    }

    updateCart();
}


// 8. Update the cart and calculate total price

function updateCart() {

    const cartItems = document.getElementById("cart-items");
    const totalElement = document.getElementById("cart-total");
    const orderButton = document.getElementById("place-order");

    cartItems.innerHTML = "";

    let total = 0;

    if (cart.length === 0) {
        cartItems.innerHTML =
            '<p class="empty-message">Your cart is empty.</p>';
    }

    cart.forEach(function(item) {

        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartRow = document.createElement("div");
        cartRow.className = "cart-item";

        cartRow.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <p>₹${item.price} each</p>
            </div>

            <div class="quantity-controls">
                <button class="decrease">−</button>
                <span>${item.quantity}</span>
                <button class="increase">+</button>
            </div>

            <strong>₹${itemTotal}</strong>
        `;

        cartRow.querySelector(".decrease").addEventListener("click", function() {
            changeQuantity(item.id, -1);
        });

        cartRow.querySelector(".increase").addEventListener("click", function() {
            changeQuantity(item.id, 1);
        });

        cartItems.appendChild(cartRow);
    });

    totalElement.textContent = total;
    orderButton.disabled = cart.length === 0;
}


// 9. Place a demo order and generate a token

document.getElementById("place-order").addEventListener("click", async function () {
    if (cart.length === 0 || !selectedOutlet) return;

    const orderButton = this;
    orderButton.disabled = true;

    try {
        const orderData = {
            outlet: selectedOutlet,
            items: cart,
            total: cart.reduce((sum, item) =>
                sum + item.price * item.quantity, 0),
            status: "Pending"
        };

        const orderId = await saveOrder(orderData);
        const token = "AB-" + orderId.slice(0, 6).toUpperCase();

        document.getElementById("order-message").textContent =
            "Order placed! Your token is " + token +
            ". Collect from " + selectedOutlet + ".";

        cart = [];
        updateCart();

    } catch (error) {
        console.error("Order failed:", error);
        document.getElementById("order-message").textContent =
            "Unable to place order. Please try again.";
        orderButton.disabled = false;
    }
});
