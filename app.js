const express    = require("express"),
      app        = express();
      bodyParser = require("body-parser"),
      ejs        = require("ejs"),
      mongoose   = require("mongoose"),
      encrypt    = require("mongoose-encryption");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

// MONGOOSE-ENCRYPTION PACKAGE USED
const secret = "ThisismyAuthenticationProject!";
userSchema.plugin(encrypt, { secret: secret , encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save((err) => {
        if(err) {
            console.log(err);
        } else {
            res.render("secrets");
        }
    });

});


app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            if(foundUser) {
                if(foundUser.password === password) {
                    res.render("secrets");
                    // console.log(foundUser.password);                // If hacker hacks the website then he can easily decrypt the password by getting into the app.js so it should be fix in the next level
                } else {
                    res.send("Check your Username/ password and try again!");
                }
            } 
        }
    });

});


app.listen(3000, (req, res) => {
    console.log("Server is online..");
});