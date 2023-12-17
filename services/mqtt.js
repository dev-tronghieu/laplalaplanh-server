const mqtt = require("mqtt");
const {
    watchDevices,
    storeStatus,
    getConfig,
    setConfig,
    alertWarningTemperature,
    WARNING_TEMPERATURE,
} = require("./firebase");

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

    /* Sync
    @params: {

    }
    */
    SYNC: "sync",
};

const mqttClient = mqtt.connect(process.env.VITE_MQTT, {
    connectTimeout: 5000,
});

const handleReceiveMessage = async (topic, message) => {
    const type = topic.split("/")[1];
    const device = topic.split("/")[2];
    const data = JSON.parse(message.toString());

    switch (type) {
        case TYPE.STATUS:
            const temperature = data.temperature;
            const epochTime = data.epochTime;

            if (temperature >= WARNING_TEMPERATURE) {
                await alertWarningTemperature(device, temperature);
            }

            storeStatus(device, { temperature, epochTime });

            break;
        case TYPE.ACTION:
            // TODO:
            // 1. If receiving action, store it to an action map (key = data.id)
            // 2. If receiving an action result, update the new config and remove the action from the map
            // 3. Timeout action from map if no result is received (maybe 5 seconds)

            const actionType = data.type;
            const actionData = data.data;
            const currentConfig = await getConfig(device);
            const newConfig = { ...currentConfig };
            switch (actionType) {
                case "set-power":
                    newConfig.power = actionData;
                    break;
                case "set-operating-mode":
                    newConfig.operatingMode = actionData;
                    break;
                case "change-effect":
                    newConfig.effect = actionData;
                    break;
                case "change-color":
                    newConfig.color = actionData;
                    break;
                default:
                    console.log(`Unknown action type: ${actionType}`);
            }
            await setConfig(device, newConfig);
            break;
        case TYPE.SYNC:
            const config = await getConfig(device);
            mqttClient.publish(
                `laplalaplanh/config/${device}`,
                JSON.stringify(config)
            );
            break;
        default:
            console.log(`Unknown type: ${type}`);
    }
};

const subscribe = async (devices) => {
    for (const device of devices) {
        mqttClient.subscribe(`laplalaplanh/status/${device}`);
        mqttClient.subscribe(`laplalaplanh/action/${device}`);
        mqttClient.subscribe(`laplalaplanh/sync/${device}`);
        console.log(`Subscribed to ${device}`);
    }
};

const unsubscribe = async (devices) => {
    for (const device of devices) {
        mqttClient.unsubscribe(`laplalaplanh/status/${device}`);
        mqttClient.unsubscribe(`laplalaplanh/action/${device}`);
        mqttClient.unsubscribe(`laplalaplanh/sync/${device}`);
        console.log(`Unsubscribed to ${device}`);
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

let devices = [];

const start = async () => {
    await watchDevices((newDevices) => {
        const devicesToAdd = newDevices.filter((x) => !devices.includes(x));
        const devicesToRemove = devices.filter((x) => !newDevices.includes(x));
        devices = newDevices;
        subscribe(devicesToAdd);
        unsubscribe(devicesToRemove);
    });
};

module.exports = {
    waitForConnection,
    start,
};
