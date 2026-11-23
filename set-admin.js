
require("dotenv").config();

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp({
    credential: applicationDefault()
});

async function makeAdmin() {
    try {
        const email = process.argv[2];

        if (!email) {
            throw new Error("Please provide the admin email address.");
        }

        const user = await getAuth().getUserByEmail(email);

        await getAuth().setCustomUserClaims(user.uid, {
            admin: true
        });

        console.log("SUCCESS: Admin privileges assigned!");
        console.log("Admin email:", user.email);
        console.log("Admin UID:", user.uid);

    } catch (error) {
        console.error("ERROR:", error.message);
        process.exitCode = 1;
    }
}

makeAdmin();
