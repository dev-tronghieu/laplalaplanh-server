const mqtt = require("mqtt");

const TYPE = {
    STATUS: "status",
    ACTION: "action",
};

/* Status
@params: {
    temperature: number
    epochTime: number
}
*/

const handleReceiveMessage = (topic, message) => {
    const type = topic.split("/")[1];
    const device = topic.split("/")[2];
    const data = JSON.parse(message.toString());

    switch (type) {
        case TYPE.STATUS:
            const temperature = data.temperature;
            const epochTime = data.epochTime;
            const date = new Date(epochTime * 1000);
            console.log(
                `[${date.toLocaleString()} - ${device}] ${temperature} °C`
            );
            break;
        case TYPE.ACTION:
            console.log(`Device ${device} action: ${data}`);
            break;
        default:
            console.log(`Unknown type: ${type}`);
    }
};

const startMqtt = async (devices) => {
    const mqttClient = mqtt.connect(process.env.VITE_MQTT, {
        connectTimeout: 5000,
    });

    mqttClient.on("connect", () => {
        console.log("MQTT Connected");
        for (const device of devices) {
            mqttClient.subscribe(`laplalaplanh/status/${device}`);
            console.log(`Subscribed to laplalaplanh/status/${device}`);
        }
        mqttClient.on("message", handleReceiveMessage);
    });
};

module.exports = {
    startMqtt,
};
