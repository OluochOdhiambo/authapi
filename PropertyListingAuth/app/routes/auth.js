const router = require("express").Router();
const User = require("../models/User");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const https = require("https");
let MongoClient = require("mongodb").MongoClient;

// REGISTER
router.post("/register", async (req, res) => {
  let response = res;
  const newUser = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    accountType: req.body.accountType,
    password: CryptoJS.AES.encrypt(
      req.body.password,
      process.env.PASS_SEC
    ).toString(),
  });

  console.log("connecting to the database...");

  MongoClient.connect(
    "mongodb://mtaayetuadmin:extractorGuru93@localhost:27017",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    function (err, client) {
      if (err) throw err;

      let db = client.db("users");
      newUser["email"] = req.body.email;
      let query = { email: req.body.email };
      let newValues = { $set: newUser };

      console.log("successfully connected to the user-accounts db");

      db.collection("user-accounts").updateOne(
        query,
        newValues,
        { upsert: true },
        function (err, res) {
          if (err) throw err;
          console.log("successfully updated or inserted");
          client.close();
          response.send(newUser);
        }
      );

      let savedUser = newUser;

      if (savedUser.accountType === "propertyOwner") {
        try {
          const newOwner = new Object({
            Userid: savedUser._id,
            Token: savedUser.password,
          });

          const axiosInstance = axios.create({
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
            }),
            headers: {
              "Access-Control-Allow-Headers": "*",
              "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
              "Content-Type": "application/json",
            },
          });

          axiosInstance
            .post("https://localhost:44393/api/Owners", newOwner)
            .then((response) => {
              res.status(200).json(response.body);
            })
            .catch((err) => {
              console.log(err);
            });
        } catch {}
      }
    }
  );
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    MongoClient.connect(
      "mongodb://mtaayetuadmin:extractorGuru93@localhost:27017",
      function (err, client) {
        if (err) throw err;

        let db = client.db("users");
        let query = { email: req.body.email };
        db.collection("user-accounts").findOne(query, function (err, result) {
          if (err) {
            throw err;
          }
          client.close();
          let user = result;
          console.log(user);
          !user && res.status(401).json("Wrong credentials!");
          const hashedPassword = CryptoJS.AES.decrypt(
            user.password,
            process.env.PASS_SEC
          );
          const originalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);
          originalPassword !== req.body.password &&
            res.status(401).json("Wrong credentials!");
          const accessToken = jwt.sign(
            {
              id: user._id,
              isAdmin: user.isAdmin,
            },
            process.env.JWT_SEC,
            { expiresIn: "2d" }
          );
          const { password, ...others } = user;

          res.status(200).json({ ...others, accessToken });
        });
      }
    );
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
