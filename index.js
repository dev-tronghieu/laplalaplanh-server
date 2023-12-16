require("dotenv").config();

const { watchDevices } = require("./services/firebase");
const {
    waitForConnection,
    subscribe,
    unsubscribe,
} = require("./services/mqtt");

const express = require("express");
const app = express();
const port = 3000;

let devices = [];

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, async () => {
    console.log(`Server listening on port ${port}`);

    await waitForConnection();
    await watchDevices((newDevices) => {
        const devicesToAdd = newDevices.filter((x) => !devices.includes(x));
        const devicesToRemove = devices.filter((x) => !newDevices.includes(x));
        devices = newDevices;
        subscribe(devicesToAdd);
        unsubscribe(devicesToRemove);
    });
});
