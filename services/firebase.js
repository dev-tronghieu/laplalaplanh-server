const { initializeApp } = require("firebase/app");
const { getFirestore, getDocs, collection } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);

const db = getFirestore(firebaseApp);

const getDevices = async () => {
    const devices = [];

    const devicesCollection = collection(db, "Devices");

    try {
        const querySnapshot = await getDocs(devicesCollection);
        querySnapshot.forEach((doc) => {
            devices.push(doc.id);
        });

        return devices;
    } catch (error) {
        console.error("Error getting documents:", error);
        throw error;
    }
};

module.exports = {
    getDevices,
};
