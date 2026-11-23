
import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const registrationForm = document.getElementById("store-registration-form");

registrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("store-message");
    const submitButton = registrationForm.querySelector('button[type="submit"]');

    const ownerName = document.getElementById("owner-name").value.trim();
    const email = document.getElementById("owner-email").value.trim();
    const phone = document.getElementById("owner-phone").value.trim();
    const password = document.getElementById("owner-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    const storeName = document.getElementById("store-name").value.trim();
    const category = document.getElementById("store-category").value;
    const location = document.getElementById("store-location").value.trim();
    const description = document.getElementById("store-description").value.trim();

    message.textContent = "";

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        message.style.color = "#B42318";
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        message.textContent = "Enter a valid 10-digit mobile number.";
        message.style.color = "#B42318";
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        // Create the store owner's Firebase account.
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        // Save the application with a pending status.
        await setDoc(doc(db, "storeApplications", user.uid), {
            ownerUid: user.uid,
            ownerName: ownerName,
            email: email,
            phone: phone,
            storeName: storeName,
            category: category,
            location: location,
            description: description,
            status: "pending",
            createdAt: serverTimestamp()
        });

        message.textContent =
            "Your store application has been submitted successfully! It is now awaiting admin approval.";

        message.style.color = "#187438";

        registrationForm.reset();

    } catch (error) {
        console.error("Store registration error:", error);

        if (error.code === "auth/email-already-in-use") {
            message.textContent =
                "This email is already registered. Please use Store Owner Login.";
        } else if (error.code === "permission-denied") {
            message.textContent =
                "Database permissions are not configured yet. Please try again after setup.";
        } else {
            message.textContent =
                "Registration failed. Please check your details and try again.";
        }

        message.style.color = "#B42318";

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Store Application";
    }
});
