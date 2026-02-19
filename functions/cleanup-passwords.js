const admin = require("firebase-admin")

// Initialize Admin SDK
// If running locally with emulators, set FIRESTORE_EMULATOR_HOST
if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({
        projectId: "cirurtec-d8f30"
    })
} else {
    // For production, you'd need a service account key
    // For now, this script is intended for use where credentials are available
    admin.initializeApp()
}

const db = admin.firestore()

async function cleanupPasswords() {
    console.log("--- Starting Password Field Cleanup ---")
    try {
        const usersSnapshot = await db.collection("users").get()
        const batch = db.batch()
        let count = 0

        usersSnapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.password !== undefined) {
                batch.update(doc.ref, {
                    password: admin.firestore.FieldValue.delete()
                })
                count++
                console.log(`Marking user ${data.username || doc.id} for cleanup.`)
            }
        })

        if (count > 0) {
            await batch.commit()
            console.log(`Successfully removed password field from ${count} users.`)
        } else {
            console.log("No users found with a password field.")
        }
    } catch (error) {
        console.error("Error during cleanup:", error)
    }
    console.log("--- Cleanup Finished ---")
}

cleanupPasswords()
