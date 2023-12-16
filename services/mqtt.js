const mqtt = require("mqtt");
const { storeStatus } = require("./firebase");

const TYPE = {
    /* Status
    @params: {
        temperature: number
        epochTime: number
    }
    */
    STATUS: "status",

    /* Action
    @params: {
        id: string
        type: string
        data: string
    }
    */
    ACTION: "action",
};

const mqttClient = mqtt.connect(process.env.VITE_MQTT, {
    connectTimeout: 5000,
});

const handleReceiveMessage = (topic, message) => {
    const type = topic.split("/")[1];
    const device = topic.split("/")[2];
    const data = JSON.parse(message.toString());

    switch (type) {
        case TYPE.STATUS:
            const temperature = data.temperature;
            const epochTime = data.epochTime;
            storeStatus(device, { temperature, epochTime });
            break;
        case TYPE.ACTION:
            console.log(`Device ${device} action: ${data}`);
            break;
        default:
            console.log(`Unknown type: ${type}`);
    }
};

const waitForConnection = () => {
    return new Promise((resolve) => {
        mqttClient.on("connect", () => {
            mqttClient.on("message", handleReceiveMessage);
            console.log("MQTT Connected");
            resolve();
        });
    });
};

const subscribe = async (devices) => {
    for (const device of devices) {
        mqttClient.subscribe(`laplalaplanh/status/${device}`);
        console.log(`Subscribed to laplalaplanh/status/${device}`);
    }
};

const unsubscribe = async (devices) => {
    for (const device of devices) {
        mqttClient.unsubscribe(`laplalaplanh/status/${device}`);
        console.log(`Unsubscribed to laplalaplanh/status/${device}`);
    }
};

module.exports = {
    waitForConnection,
    subscribe,
    unsubscribe,
};
