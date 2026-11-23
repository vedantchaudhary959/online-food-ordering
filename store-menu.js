
import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// HTML ELEMENTS
const storeName = document.getElementById("storeName");
const storeLocation = document.getElementById("storeLocation");
const storeDescription = document.getElementById("storeDescription");
const menuItems = document.getElementById("menuItems");

const menuSearch = document.getElementById("menuSearch");
const categoryFilter = document.getElementById("categoryFilter");

const params = new URLSearchParams(window.location.search);
const storeId = params.get("storeId");

let authReady = false;
let allProducts = [];
let currentStore = null;

// AUTHENTICATION STATUS
onAuthStateChanged(auth, () => {
    authReady = true;
});


// CATEGORY NORMALIZATION
function getCategoryGroup(category) {
    const value = String(category || "").toLowerCase().trim();

    if (value.includes("snack")) return "snacks";

    if (
        value.includes("beverage") ||
        value.includes("drink")
    ) return "beverages";

    if (
        value.includes("meal") ||
        value.includes("main") ||
        value.includes("food")
    ) return "meals";

    return "other";
}


// ADD FOOD TO CART
function addToCart(product) {

    if (!authReady) {
        alert("Please wait a moment and try again.");
        return;
    }

    if (!auth.currentUser) {
        const returnUrl = window.location.href;

        window.location.href =
            "student-login.html?returnUrl=" +
            encodeURIComponent(returnUrl);

        return;
    }

    const cartItem = {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        ownerUid: currentStore.ownerUid,
        storeId: storeId,
        storeName: currentStore.storeName
    };

    let cart = JSON.parse(
        localStorage.getItem("abesBiteCart")
    ) || [];

    // Prevent mixing items from different stores.
    if (
        cart.length > 0 &&
        cart.some(item => item.storeId !== storeId)
    ) {
        const replaceCart = confirm(
            "Your cart contains items from another store. " +
            "Would you like to clear it and add this item?"
        );

        if (!replaceCart) return;

        cart = [];
    }

    const existingItem = cart.find(
        item => item.productId === product.id
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(cartItem);
    }

    localStorage.setItem(
        "abesBiteCart",
        JSON.stringify(cart)
    );

    alert(product.name + " added to cart!");

    window.location.href = "cart.html";
}


// DISPLAY FOOD CARDS
function displayProducts(products) {

    menuItems.replaceChildren();

    if (products.length === 0) {
        const message = document.createElement("p");

        message.textContent =
            "No food items found. Try another search or category.";

        menuItems.appendChild(message);
        return;
    }

    products.forEach(product => {

        const card = document.createElement("div");
        card.className = "food-card";

        const category = document.createElement("span");
        category.className = "food-category";

        category.textContent =
            product.category || "Other";

        const name = document.createElement("h3");
        name.textContent = product.name || "Food item";

        const description = document.createElement("p");
        description.textContent =
            product.description || "Freshly prepared for you.";

        const price = document.createElement("strong");
        price.className = "food-price";

        price.textContent =
            "₹" + Number(product.price).toFixed(2);

        const addButton = document.createElement("button");
        addButton.textContent = "Add to Cart";
        addButton.className = "primary-btn";

        addButton.addEventListener("click", () => {
            addToCart(product);
        });

        card.append(
            category,
            name,
            description,
            price,
            addButton
        );

        menuItems.appendChild(card);
    });
}


// SEARCH AND CATEGORY FILTER
function filterProducts() {

    const searchText = menuSearch.value
        .toLowerCase()
        .trim();

    const selectedCategory = categoryFilter.value;

    const filteredProducts = allProducts.filter(product => {

        const name = String(product.name || "").toLowerCase();

        const description = String(
            product.description || ""
        ).toLowerCase();

        const matchesSearch =
            name.includes(searchText) ||
            description.includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            getCategoryGroup(product.category) === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayProducts(filteredProducts);
}


// LOAD STORE MENU
async function loadStoreMenu() {

    try {

        if (!storeId) {
            storeName.textContent = "Store not found";

            menuItems.textContent =
                "Please select a store from the homepage.";

            return;
        }

        // FETCH STORE
        const storeRef = doc(db, "stores", storeId);
        const storeSnapshot = await getDoc(storeRef);

        if (!storeSnapshot.exists()) {

            storeName.textContent = "Store not found";

            menuItems.textContent =
                "This store is unavailable.";

            return;
        }

        const store = storeSnapshot.data();

        if (store.status !== "approved") {

            storeName.textContent = "Store unavailable";

            menuItems.textContent =
                "This store is not currently available.";

            return;
        }

        currentStore = store;

        storeName.textContent =
            store.storeName || "Campus Store";

        storeLocation.textContent =
            store.location || "";

        storeDescription.textContent =
            store.description || "";


        // FETCH AVAILABLE PRODUCTS
        const productsQuery = query(
            collection(db, "products"),
            where("ownerUid", "==", store.ownerUid),
            where("available", "==", true)
        );

        const productsSnapshot = await getDocs(productsQuery);

        allProducts = [];

        productsSnapshot.forEach(productDoc => {

            const food = productDoc.data();

            allProducts.push({
                id: productDoc.id,
                ...food
            });

        });


        // DISPLAY PRODUCTS
        filterProducts();

        if (allProducts.length === 0) {
            menuItems.textContent =
                "No food items are available yet.";
        }

    } catch (error) {

        console.error("Store menu error:", error);

        menuItems.textContent =
            "Unable to load the menu. Please try again.";

    }
}


// FILTER EVENT LISTENERS
menuSearch.addEventListener("input", filterProducts);

categoryFilter.addEventListener("change", filterProducts);


// START
loadStoreMenu();
