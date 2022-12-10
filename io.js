const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/front/index.html');
});

server.listen(8081, () => {
    console.log('listening on *:8081');
});

module.exports.io = new Server(server);