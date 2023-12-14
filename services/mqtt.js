const mqtt = require("mqtt");

const startMqtt = () => {
    const mqttClient = mqtt.connect(process.env.VITE_MQTT, {
        connectTimeout: 5000,
    });

    mqttClient.on("connect", () => {
        console.log("MQTT Connected");
    });
};

module.exports = {
    startMqtt,
};
