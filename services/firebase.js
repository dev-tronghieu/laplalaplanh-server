const { initializeApp } = require("firebase/app");
const {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    limit,
    orderBy,
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

const storeAction = async (device, action) => {
    const actionLogs = collection(db, "Devices", device, "ActionLogs");
    await addDoc(actionLogs, action);
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

/**
 * @param {string[]} to
 * @param {string} subject
 * @param {string} html
 */
const alertMail = async ({ to, subject, html }) => {
    const mailCollection = collection(db, "mail");
    await addDoc(mailCollection, { to, message: { subject, html } });
};

const WARNING_TEMPERATURE = 56;
const DANGER_TEMPERATURE = 65;

const alertWarningTemperature = async (deviceId, temperature) => {
    const statusLogsRef = collection(db, "Devices", deviceId, "StatusLogs");

    const lastStatusQuery = query(
        statusLogsRef,
        orderBy("epochTime", "desc"),
        limit(1)
    );

    const lastStatusSnapshot = await getDocs(lastStatusQuery);

    try {
        const lastStatus = lastStatusSnapshot.docs[0].data();

        const lastTemperature = lastStatus.temperature;

        if (lastTemperature >= DANGER_TEMPERATURE) {
            return;
        }

        if (
            lastTemperature >= WARNING_TEMPERATURE &&
            temperature < DANGER_TEMPERATURE
        ) {
            return;
        }
    } catch (error) {
        console.log("[ERROR] alertWarningTemperature", error);
    }

    const deviceRef = doc(db, "Devices", deviceId);
    const deviceDoc = await getDoc(deviceRef);
    const deviceData = deviceDoc.data();

    const title = `[ĐÈN LẤP LA LẤP LÁNH]: CẢNH BÁO NHIỆT ĐỘ CAO!!!`;

    let html = `
        <h1>Cảnh báo</h1>
        <p>Thiết bị ${
            deviceData.name
        } đạt ${temperature}°C vào lúc ${new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
    })}</p>
    `;

    if (temperature >= DANGER_TEMPERATURE) {
        html += `<p>Thiết bị đã tự động tắt để đảm bảo an toàn</p>`;
    }

    alertMail({ to: deviceData.users, subject: title, html });
};

module.exports = {
    storeStatus,
    storeAction,
    getConfig,
    setConfig,
    watchDevices,
    alertWarningTemperature,
    defaultConfig,
    WARNING_TEMPERATURE,
};
