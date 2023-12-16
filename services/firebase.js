const { initializeApp } = require("firebase/app");
const {
    getFirestore,
    collection,
    onSnapshot,
    addDoc,
} = require("firebase/firestore");

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

const watchDevices = async (callback) => {
    const devicesCollection = collection(db, "Devices");

    const unsubscribe = onSnapshot(devicesCollection, (querySnapshot) => {
        const newDevices = [];
        querySnapshot.forEach((doc) => {
            newDevices.push(doc.id);
        });
        callback(newDevices);
    });

    return unsubscribe;
};

const storeStatus = async (device, status) => {
    const statusLogs = collection(db, "Devices", device, "StatusLogs");
    await addDoc(statusLogs, status);
};

module.exports = {
    watchDevices,
    storeStatus,
};
