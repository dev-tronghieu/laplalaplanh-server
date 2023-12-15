require("dotenv").config();

const { getDevices } = require("./services/firebase");
const { startMqtt } = require("./services/mqtt");

const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, async () => {
    console.log(`LLLL Server listening on port ${port}`);

    const devices = await getDevices();
    await startMqtt(devices);
});
