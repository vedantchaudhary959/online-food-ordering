
import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const adminForm = document.getElementById("adminLoginForm");
const forgotPasswordLink = document.getElementById("forgotPassword");
const adminMessage = document.getElementById("admin-message");

// ADMIN LOGIN
adminForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        // Refresh Firebase ID token.
        const tokenResult = await userCredential.user.getIdTokenResult(true);

        // Verify admin privileges.
        if (tokenResult.claims.admin !== true) {
            await signOut(auth);
            alert("Access denied. This account is not an administrator.");
            return;
        }

        alert("Admin login successful!");
        window.location.href = "admin-dashboard.html";

    } catch (error) {
        console.error("Admin login error:", error.code, error.message);
        alert("Login failed. Please check your email and password.");
    }
});


// FORGOT PASSWORD
forgotPasswordLink.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();

    if (!email) {
        adminMessage.textContent = "Please enter your administrator email first.";
        adminMessage.style.color = "red";
        document.getElementById("adminEmail").focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);

        adminMessage.textContent =
            "Password reset link sent! Check your Gmail inbox and spam folder.";

        adminMessage.style.color = "green";

    } catch (error) {
        console.error("Password reset error:", error.code, error.message);

        if (error.code === "auth/invalid-email") {
            adminMessage.textContent = "Please enter a valid email address.";
        } else if (error.code === "auth/user-not-found") {
            adminMessage.textContent = "No account found with this email.";
        } else {
            adminMessage.textContent =
                "Unable to send reset email. Please try again.";
        }

        adminMessage.style.color = "red";
    }
});
