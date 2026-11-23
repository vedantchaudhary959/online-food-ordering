
import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ownerLoginForm = document.getElementById("owner-login-form");
const message = document.getElementById("owner-login-message");

ownerLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("owner-email").value.trim();
    const password = document.getElementById("owner-password").value;

    message.textContent = "Checking your account...";
    message.style.color = "#751D2A";

    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        // Find this owner's store application.
        const applicationRef = doc(db, "storeApplications", user.uid);
        const applicationSnapshot = await getDoc(applicationRef);

        if (!applicationSnapshot.exists()) {
            await signOut(auth);
            message.textContent = "No store application was found for this account.";
            message.style.color = "#B42318";
            return;
        }

        const application = applicationSnapshot.data();

        if (application.status !== "approved") {
            await signOut(auth);

            if (application.status === "pending") {
                message.textContent = "Your application is still awaiting admin approval.";
            } else if (application.status === "rejected") {
                message.textContent = "Your store application was rejected. Please contact the administrator.";
            } else {
                message.textContent = "Your store account is not currently approved.";
            }

            message.style.color = "#B42318";
            return;
        }

        // Approved owner: open the dashboard.
        window.location.replace("owner-dashboard.html");

    } catch (error) {
        console.error("Owner login error:", error);

        message.textContent = "Login failed. Please check your email and password.";
        message.style.color = "#B42318";
    }
});

// Forgot Password
document.getElementById("forgot-password").addEventListener("click", async (event) => {
    event.preventDefault();

    const email = document.getElementById("owner-email").value.trim();

    if (!email) {
        message.textContent = "Please enter your email address first.";
        message.style.color = "#B42318";
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        message.textContent = "Password reset email sent. Please check your inbox.";
        message.style.color = "#187438";
    } catch (error) {
        console.error("Password reset error:", error);
        message.textContent = "Could not send password reset email. Please check the email address.";
        message.style.color = "#B42318";
    }
});
