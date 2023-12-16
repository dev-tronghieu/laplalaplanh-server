const { initializeApp } = require("firebase/app");
const {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    addDoc,
    getDoc,
    updateDoc,
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

const defaultConfig = {
    power: "off",
    operatingMode: "auto",
    effect: "single-color",
    color: "ffffff",
};

const storeStatus = async (device, status) => {
    const statusLogs = collection(db, "Devices", device, "StatusLogs");
    await addDoc(statusLogs, status);
};

const getConfig = async (device) => {
    const configRef = doc(db, "Devices", device);
    const configDoc = await getDoc(configRef);
    return configDoc.data().config;
};

const setConfig = async (device, config) => {
    const configRef = doc(db, "Devices", device);
    await updateDoc(configRef, { config });
};

const watchDevices = async (callback) => {
    const devicesCollection = collection(db, "Devices");

    const unsubscribe = onSnapshot(devicesCollection, (querySnapshot) => {
        const newDevices = [];
        querySnapshot.forEach((doc) => {
            newDevices.push(doc.id);
            if (doc.data().config === undefined) {
                setConfig(doc.id, defaultConfig);
            }
        });
        callback(newDevices);
    });

    return unsubscribe;
};

module.exports = {
    storeStatus,
    getConfig,
    watchDevices,
    defaultConfig,
};
