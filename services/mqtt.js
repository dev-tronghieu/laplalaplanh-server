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
            const actionType = data.type;
            const actionData = data.data;

            switch (actionType) {
                case "result":
                    if (actionData === "success") {
                        const config = await getConfig(device);
                        const action = actionMap.get(data.id);
                        if (!action) {
                            console.log(
                                `[${device}] Action ${data.id} not found`
                            );
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

                        console.log(
                            `[${device}] Action ${data.id} success`,
                            config
                        );

                        setConfig(device, config);
                    }
                    actionMap.delete(data.id);
                    break;
                default:
                    actionMap.set(data.id, {
                        type: actionType,
                        data: actionData,
                    });

                    const timeoutAt = data.timeoutAt;
                    const timeoutAfterMs = timeoutAt * 1000 - Date.now();

                    console.log(
                        `[${device}] Action ${data.id} will timeout in ${timeoutAfterMs}ms`
                    );

                    setTimeout(() => {
                        if (actionMap.has(data.id)) {
                            actionMap.delete(data.id);
                            console.log(
                                `[${device}] Action ${data.id} timeout`
                            );
                        }
                    }, timeoutAfterMs);
            }
            break;

        case TYPE.SYNC:
            console.log(`[${device}] Syncing`);
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
