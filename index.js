require("dotenv").config();

const { waitForConnection, start } = require("./services/mqtt");

const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, async () => {
    console.log(`Server listening on port ${port}`);

    await waitForConnection();
    await start();
});
