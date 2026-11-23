
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
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

        // Only show the dashboard to verified administrators.
        document.body.style.visibility = "visible";

    } catch (error) {
        console.error("Admin verification failed:", error);
        await signOut(auth);
        window.location.replace("admin-login.html");
    }
});
