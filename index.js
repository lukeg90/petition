const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const db = require("./utils/db");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const { hash, compare } = require("./utils/bc");
const csurf = require("csurf");
const {
    requireLoggedOutUser,
    requireNoSignature,
    requireSignature,
    makeCookiesSafe,
    requireLoggedInUser
} = require("./middleware");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(
    express.urlencoded({
        extended: false
    })
);

app.use(express.static("./public"));

app.use(
    cookieSession({
        secret: `The owls are not what they seem.`,
        maxAge: 1000 * 60 * 60
    })
);

app.use(csurf());

app.use(makeCookiesSafe);

app.use(requireLoggedInUser);

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/petition", requireNoSignature, (req, res) => {
    console.log("User ID: ", req.session.userId);
    res.render("petition", {});
});

app.post("/petition", requireNoSignature, (req, res) => {
    const { signature } = req.body;
    db.addSignature(req.session.userId, signature)
        .then(result => {
            req.session.signed = true;
            console.log(result.rows[0]);
            console.log(
                "Signature posted successfully! User id: ",
                result.rows[0].user_id
            );
            res.redirect("/thanks");
        })
        .catch(err => {
            console.log("Signature post error: ", err);
            res.render("petition", {
                error: err
            });
        });
});

app.get("/thanks", requireSignature, (req, res) => {
    let numSigners;
    db.getSignatures()
        .then(result => {
            numSigners = result.rows.length;
            return db.getSignaturebyUserId(req.session.userId);
        })
        .then(result => {
            const signer = result.rows[0];
            console.log("Signer: ", signer);
            res.render("thanks", {
                signer,
                numSigners
            });
        })
        .catch(err => {
            console.log("Error in thank you page: ", err);
        });
});

app.post("/thanks", (req, res) => {
    db.deleteSignature(req.session.userId).then(() => {
        req.session.signed = false;
        res.redirect("/petition");
    });
});

app.get("/signers", requireSignature, (req, res) => {
    db.getSigners()
        .then(result => {
            console.log("signers: ", result.rows);
            const signers = result.rows;
            for (let i = 0; i < signers.length; i++) {
                if (signers[i].city != null) {
                    signers[i].urlCity = signers[i].city;
                    signers[i].cityName = signers[i].city.replace(/_/g, " ");
                }
            }
            res.render("signers", { signers });
        })
        .catch(err => {
            res.render("signers", { error: err });
        });
});

app.get("/signers/:city", requireSignature, (req, res) => {
    let city = req.params.city.replace(/_/g, " ");
    console.log("req.params.city: ", req.params.city);
    console.log("City in URL: ", city);
    db.getSignersByCity(req.params.city)
        .then(result => {
            const signers = result.rows;
            res.render("city-signers", { signers, city });
        })
        .catch(err => {
            res.render("city-signers", { error: err });
        });
});

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("register", {});
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    // grab user input and read it on the server
    const { first, last, email, password } = req.body;

    // hash the password that the user typed and THEN
    hash(password)
        .then(hashedPw => {
            console.log("hashedPw: ", hashedPw);
            // insert a row in the USERS table
            return db.addUser(first, last, email, hashedPw);
        })
        .then(result => {
            // if insert is successful, add userId in a cookie
            req.session.userId = result.rows[0].id;
            console.log("User ID: ", req.session.userId);
            res.redirect("/profile");
        })
        // if insert fails, re-render template with an error message
        .catch(err => {
            res.render("register", { error: err });
        });
});

app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login", {});
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    const { email, password } = req.body;
    console.log("Entered email address: ", email);
    let id;
    // get the user's stored hashed password from the db using the user's email address
    db.getUserByEmail(email)
        .then(result => {
            console.log("User: ", result.rows);
            if (result.rows[0].signature) {
                req.session.signed = true;
            }
            id = result.rows[0].id;
            // pass the hashed password to COMPARE along with the password the user typed in the input field
            return compare(password, result.rows[0].password);
        })
        .then(result => {
            console.log("result of compare: ", result);
            // if they match, COMPARE returns a boolean value of true
            if (result) {
                // store the userId in a cookie
                req.session.userId = id;
                res.redirect("/petition");
            } else {
                // if they don't match, COMPARE returns a boolean value of false and re-render with error message
                res.render("login", {
                    error: "Password incorrect. Please try again."
                });
            }
        })
        .catch(err => {
            console.log("Login error: ", err);
            res.render("login", { error: err });
        });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});

app.get("/profile", (req, res) => {
    res.render("profile", {});
});

app.post("/profile", (req, res) => {
    let { age, city, homepage } = req.body;
    if (age == "") {
        age = null;
    }
    if (homepage && !homepage.startsWith("http")) {
        res.render("profile", {
            error: "Homepage url must start with http:// or https://"
        });
    } else {
        //remove spaces from city
        city = city.replace(/\s/g, "_");
        db.addProfile(age, city, homepage, req.session.userId)
            .then(result => {
                console.log("User profile: ", result.rows);
                res.redirect("/petition");
            })
            .catch(err => {
                res.render("profile", { error: err });
            });
    }
});

app.get("/profile/edit", (req, res) => {
    db.getUserProfile(req.session.userId).then(result => {
        const user = result.rows[0];
        if (user.city) {
            user.city = user.city.replace(/_/g, " ");
        }
        console.log("User: ", user);
        res.render("profile-edit", { user });
    });
});

app.post("/profile/edit", (req, res) => {
    let { first, last, email, password, age, city, homepage } = req.body;
    //remove spaces from city
    city = city.replace(/\s/g, "_");
    if (age == "") {
        age = null;
    }
    if (homepage && !homepage.startsWith("http")) {
        res.render("profile", {
            error: "Homepage url must start with http:// or https://"
        });
    }
    if (password) {
        // hash the password!!
        hash(password)
            .then(hashedPw => {
                // update 4 columns in users
                return db.updateUserAndPassword(
                    first,
                    last,
                    email,
                    hashedPw,
                    req.session.userId
                );
            })
            .then(() => {
                // upsert user_profiles
                return db.upsertUserProfile(
                    age,
                    city,
                    homepage,
                    req.session.userId
                );
            })
            .then(() => {
                res.redirect("/petition");
            })
            .catch(err => {
                console.log("Error updating user profile; ", err);
                res.render("profile-edit", { error: err });
            });
    } else {
        // update 3 columns in users
        db.updateUser(first, last, email, req.session.userId)
            .then(() => {
                return db.upsertUserProfile(
                    age,
                    city,
                    homepage,
                    req.session.userId
                );
            })
            .then(() => {
                res.redirect("/petition");
            })
            .catch(err => {
                console.log("Error updating user profile: ", err);
                res.render("profile-edit", { error: err });
            });
    }
});

app.listen(port, () => console.log(`Petition up and running on ${port}`));
