const express = require("express");
const bodyParser = require("body-parser");

//Routes
const moviesRoutes = require("./routes/movies");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
    );
    next();
});

//Introduction message
app.get('/', function (req, res) {
    res.send("Node server is up.");
});

app.use("/movies", moviesRoutes);

module.exports = app;
