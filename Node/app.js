const express = require("express");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");
const crypt = require("./nakajZe/crypt.js");
const http = require("http"); 
const { Server } = require("socket.io"); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 


mongoose.connect("mongodb+srv://lz:roxyroxy@cluster0.bbz6s13.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => console.log("MongoDB connected!"))
    .catch(err => console.error("MongoDB connection error:", err));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
    session
    ({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

const userSchema = new mongoose.Schema
({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);




app.get("/", (req, res) => 
{
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/reg.html", (req, res) => 
{
    res.sendFile(path.join(__dirname, "views", "reg.html"));
});

app.get("/login.html", (req, res) => 
{
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/chat-room.html", (req, res) => 
{
    res.sendFile(path.join(__dirname, "views", "chat-room.html"));
});

app.get("/dashboard", (req, res) => 
    {
    if (req.session.user) 
    {
        res.status(200).send("User is logged in");
    } 
    else 
    {
        res.status(401).send("Unauthorized. Please log in.");
    }
});

app.get("/logout", (req, res) => 
{
    req.session.destroy((err) => 
    {
        if (err) 
        {
            console.error("Error during logout:", err);
            return res.status(500).send("Error during logout.");
        }
        res.redirect("/");
    });
});





app.post("/reg", async (req, res) => 
{
    const { username, email, password } = req.body;

    try 
    {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) 
        {
            return res.status(400).send("Username or email is allready in use.");
        }

        const user = new User
        ({
            username: username,
            email: email,
            password: crypt(password),
        });

        console.log("User data before saving:", user); 
        await user.save();
        req.session.user = { username: user.username, email: user.email };
        res.sendFile(path.join(__dirname, "views", "index.html"));
    } 
    catch (err)
    {
        console.error("Error saving user data:", err);
        res.status(500).send("Error saving user data.");
    }
});

app.post("/login", async (req, res) => 
    {
    const { username, password } = req.body;

    try 
    {
        const user = await User.findOne({ username: username });
        console.log("User found:", user); 
        if (user && user.password === crypt(password)) 
        {
            req.session.user = { username: user.username, email: user.email };
            res.sendFile(path.join(__dirname, "views", "index.html"));
        } 
        else 
        {
            res.status(401).send("Invalid username or password");
        }
    } 
    catch (err) 
    {
        console.error("Error during login:", err);
        res.status(500).send("Error during login.");
    }
});

io.on("connection", (socket) => {
    console.log("A user connected");

    // Broadcast messages to all connected clients
    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

server.listen(3000, () => 
{
    console.log("Server is running on http://localhost:3000");
});