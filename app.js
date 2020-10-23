// const passport = require("passport");
// const { session } = require("passport");

require("dotenv").config();
const express    = require("express"),
      bodyParser = require("body-parser"),
      ejs        = require("ejs"),
      mongoose   = require("mongoose"),
//    encrypt    = require("mongoose-encryption");
//    md5        = require("md5");
//    bcrypt     = require("bcrypt");
      session    = require("express-session"),
      passport   = require("passport"),
      passportLocalMongoose = require("passport-local-mongoose"),
      GoogleStrategy        = require("passport-google-oauth20").Strategy,
      findOrCreate          = require("mongoose-findorcreate");

// const saltRounds = 10;

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));

// SETUP SESSION
app.use(session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);     // deprication warning

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

// MONGOOSE-ENCRYPTION PACKAGE USED
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"]});

// SETUP passportLocalMongoose Plugin
userSchema.plugin(passportLocalMongoose);

//SETUP findOrCreate Plugin
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// Use passportLocalMongoose Plugin
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// REPLACED ABOVE CODE WITH BELOW
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

// GOOGLE OAUTH20
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",

    // GOOGLE PLUS DEPRECATED
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", (req, res) => {
    res.render("home");
});

// TO BRING POP-UP TO SIGN IN/UP
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

// IF USER GO DIRECTLY TO SECRETS PAGE THEN WE HAVE TO FIRST AUTHENTICATE!!
app.get("/secrets", (req, res) => {

    // if(req.isAuthenticated()) {
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }

    User.find({"secret": {$ne: null}}, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            if(foundUser) {
                res.render("secrets", {usersWithSecrets: foundUser});
            }
        }
    });
});

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            if(foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.post("/register", (req, res) => {

    // bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    //     newUser.save((err) => {
    //         if(err) {
    //             console.log(err);
    //         } else {
    //             res.render("secrets");
    //         }
    //     });
    // });

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }
    });

});


app.post("/login", (req, res) => {

    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({email: username}, (err, foundUser) => {
    //     if(err) {
    //         console.log(err);
    //     } else {
    //         if(foundUser) {
    //             // if(foundUser.password === password) {
    //             //     res.render("secrets");
    //             //     // console.log(foundUser.password);                // If hacker hacks the website then he can easily decrypt the password by getting into the app.js so it should be fix in the next level
    //             // }

    //             bcrypt.compare(password, foundUser.password, (err, result) => {
    //                 if(result === true) {
    //                     res.render("secrets");
    //                 }
    //             });
    //         }
    //     }
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if(err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, (req, res) => {
    console.log("Server is online..");
});