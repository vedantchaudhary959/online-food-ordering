
import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const phoneForm = document.getElementById("phone-form");
const emailForm = document.getElementById("email-form");
const phoneTab = document.getElementById("phone-tab");
const emailTab = document.getElementById("email-tab");
const message = document.getElementById("login-message");

let confirmationResult = null;
let recaptchaVerifier = null;

function showMessage(text, color = "#751D2A") {
    message.textContent = text;
    message.style.color = color;
}

function redirectAfterLogin() {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get("returnUrl");

    if (returnUrl) {
        try {
            const destination = new URL(returnUrl);

            if (destination.origin === window.location.origin) {
                window.location.href = destination.href;
                return;
            }
        } catch (error) {
            console.error("Invalid return URL:", error);
        }
    }

    window.location.href = "index.html";
}

// Switch between phone and email login
window.showLogin = function (method) {
    showMessage("");

    if (method === "phone") {
        phoneForm.style.display = "flex";
        emailForm.style.display = "none";

        phoneTab.classList.add("active");
        emailTab.classList.remove("active");
    } else {
        phoneForm.style.display = "none";
        emailForm.style.display = "flex";

        emailTab.classList.add("active");
        phoneTab.classList.remove("active");
    }
};

// Email login
emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        showMessage("Signing in...");

        await signInWithEmailAndPassword(auth, email, password);

        showMessage("Login successful!");
        redirectAfterLogin();

    } catch (error) {
        console.error(error);
        showMessage(error.message, "red");
    }
});


// Phone OTP login and verification
phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phoneInput = document.getElementById("phone");
    const phone = phoneInput.value.trim();
    const otpInput = document.getElementById("phone-otp");

    // If OTP has already been sent, verify it
    if (confirmationResult && otpInput) {
        try {
            showMessage("Verifying OTP...");

            await confirmationResult.confirm(otpInput.value.trim());

            showMessage("Phone login successful!");
            redirectAfterLogin();

        } catch (error) {
            console.error(error);
            showMessage("Incorrect OTP. Please try again.", "red");
        }

        return;
    }

    // Validate mobile number
    if (!/^[0-9]{10}$/.test(phone)) {
        showMessage("Enter a valid 10-digit mobile number.", "red");
        return;
    }

    try {
        showMessage("Sending OTP...");

        if (!recaptchaVerifier) {
            recaptchaVerifier = new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                { size: "normal" }
            );

            await recaptchaVerifier.render();
        }

        confirmationResult = await signInWithPhoneNumber(
            auth,
            "+91" + phone,
            recaptchaVerifier
        );

        let newOtpInput = document.getElementById("phone-otp");

        if (!newOtpInput) {
            newOtpInput = document.createElement("input");
            newOtpInput.type = "text";
            newOtpInput.id = "phone-otp";
            newOtpInput.placeholder = "Enter the 6-digit OTP";
            newOtpInput.maxLength = 6;
            newOtpInput.required = true;

            phoneForm.insertBefore(
                newOtpInput,
                phoneForm.querySelector("button")
            );
        }

        phoneInput.disabled = true;
        phoneForm.querySelector("button").textContent = "Verify OTP";

        showMessage("OTP sent! Enter the code received on your phone.");

    } catch (error) {
        console.error(error);
        showMessage(error.message, "red");
    }
});


// Google login
document.getElementById("google-login").addEventListener("click", async () => {
    try {
        showMessage("Connecting to Google...");

        const provider = new GoogleAuthProvider();

        await signInWithPopup(auth, provider);

        showMessage("Google login successful!");
        redirectAfterLogin();

    } catch (error) {
        console.error(error);
        showMessage(error.message, "red");
    }
});