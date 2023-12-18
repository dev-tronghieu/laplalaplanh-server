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

const actionMap = new Map();

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

            switch (actionType) {
                case "result":
                    if (actionData === "success") {
                        const config = await getConfig(device);
                        const action = actionMap.get(data.id);
                        if (!action) {
                            console.log(`Action ${data.id} not found`);
                            break;
                        }

                        switch (action.type) {
                            case "set-power":
                                config.power = action.data;
                                break;
                            case "set-operating-mode":
                                config.operatingMode = action.data;
                                break;
                            case "change-effect":
                                config.effect = action.data;
                                break;
                            case "change-color":
                                config.color = action.data;
                                break;
                        }

                        setConfig(device, config);
                    }
                    actionMap.delete(data.id);
                    break;
                default:
                    actionMap.set(data.id, {
                        type: actionType,
                        data: actionData,
                    });
                    setTimeout(() => {
                        actionMap.delete(data.id);
                        console.log(`Action ${data.id} timeout`, actionMap);
                    }, 1000 * 10);
            }
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
