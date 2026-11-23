
import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const phoneForm = document.getElementById("phone-form");
const emailForm = document.getElementById("email-form");
const message = document.getElementById("register-message");

let confirmationResult = null;
let recaptchaVerifier = null;
let registeredPhoneName = "";

// Display messages
function showMessage(text, color = "#751D2A") {
    message.textContent = text;
    message.style.color = color;
}

// Switch between phone and email registration
window.showRegister = function (method) {
    message.textContent = "";

    const phoneTab = document.getElementById("phone-tab");
    const emailTab = document.getElementById("email-tab");

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

// Save student details in Firestore
async function saveStudentProfile(user, name) {
    await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        name: name || user.displayName || "Student",
        email: user.email || null,
        phone: user.phoneNumber || null,
        role: "student",
        createdAt: serverTimestamp()
    }, { merge: true });
}

// EMAIL REGISTRATION
emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("email-name").value.trim();
    const email = document.getElementById("student-email").value.trim();
    const password = document.getElementById("student-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.", "red");
        return;
    }

    try {
        showMessage("Creating your account...");

        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await updateProfile(result.user, {
            displayName: name
        });

        await saveStudentProfile(result.user, name);

        showMessage("Account created successfully!");
        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        showMessage(error.message, "red");
    }
});

// PHONE REGISTRATION AND OTP VERIFICATION
phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("phone-name").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    const otpInput = document.getElementById("phone-otp");

    if (confirmationResult && otpInput) {
        try {
            showMessage("Verifying OTP...");

            const result = await confirmationResult.confirm(
                otpInput.value.trim()
            );

            await updateProfile(result.user, {
                displayName: registeredPhoneName
            });

            await saveStudentProfile(result.user, registeredPhoneName);

            showMessage("Account created successfully!");
            window.location.href = "index.html";

        } catch (error) {
            console.error(error);
            showMessage("Invalid OTP. Please try again.", "red");
        }

        return;
    }

    if (!name) {
        showMessage("Please enter your full name.", "red");
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        showMessage("Enter a valid 10-digit mobile number.", "red");
        return;
    }

    try {
        showMessage("Preparing phone verification...");

        registeredPhoneName = name;

        if (!recaptchaVerifier) {
            recaptchaVerifier = new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                { size: "normal" }
            );
        }

        await recaptchaVerifier.render();

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

        document.getElementById("phone-name").disabled = true;
        document.getElementById("phone-number").disabled = true;

        phoneForm.querySelector("button").textContent = "Verify OTP";

        showMessage("OTP sent! Enter the code received on your phone.");

    } catch (error) {
        console.error(error);
        showMessage(error.message, "red");
    }
});

// GOOGLE REGISTRATION
document.getElementById("google-register").addEventListener("click", async () => {
    try {
        showMessage("Connecting to Google...");

        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        await saveStudentProfile(
            result.user,
            result.user.displayName || "Student"
        );

        showMessage("Google registration successful!");
        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        showMessage(error.message, "red");
    }
});
