const express = require("express");
const app = express();
const multer = require("multer");
const fs = require("fs");
const OAuth2Data = require("./client_secret.json");
const { google } = require("googleapis");



const client_id = OAuth2Data.web.client_id;
const client_secret = OAuth2Data.web.client_secret;
const redirect_uris = OAuth2Data.web.redirect_uris[0];

const OAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris
);

var auth = false;

const scopes = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.set("view engine", "ejs");

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./files");
  },
  filename: function (req, file, callback) {
    callback(null,file.originalname);
  },
});

var upload = multer({
  storage: Storage,
}).single("file"); 

app.get("/", (req, res) => {
  if (!auth) {
    var url = OAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });
    res.render("welcome", { url: url });
  } else {
    var oauth2 = google.oauth2({
      auth: OAuth2Client,
      version: "v2",
    });

    oauth2.userinfo.get(function (err, response) {
        name = response.data.name
        picture = response.data.picture


        res.render("upload", {
          name: response.data.name,
          picture: response.data.picture,
          success:false
        });
    });
  }
});

app.post("/uploadFiles", (req, res) => {
  upload(req, res, function (err) {
      const drive = google.drive({ version: "v3",auth:OAuth2Client  });
      const fileMetadata = {
        name: req.file.filename,
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (err,file) => {
            fs.unlinkSync(req.file.path)
            res.render("upload",{name:name,picture:picture,success:true})
        }
      );
  });
});

app.get('/logout',(req,res) => {
    auth = false
    res.redirect('/')
})

app.get("/google/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    OAuth2Client.getToken(code, function (err, tokens) {
        OAuth2Client.setCredentials(tokens);
        auth = true;
        res.redirect("/");
    });
  }
});

app.listen(4000, () => {
  console.log("App is listening on Port 4000");
});
