var express = require('express');
var router = express.Router();

const async = require("async");
const readline = require('readline');
const { google } = require('googleapis');
const opn = require('opn');
const path = require('path');
const fs = require('fs');

const keyfile = path.join(__dirname, '../credentials.json');
const keys = JSON.parse(fs.readFileSync(keyfile));
const scopes = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

// Create an oAuth2 client to authorize the API call
const client = new google.auth.OAuth2(
  keys.installed.client_id,
  keys.installed.client_secret,
  keys.installed.redirect_uris[1]
);

// Generate the url that will be used for authorization
const authorizeUrl = client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
});

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles (auth, callback) {
  const service = google.drive('v3');
  service.files.list({
    auth: auth,
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)'
  }, (err, res) => {
    if (err) {
      console.error('The API returned an error.');
      throw err;
    }
    const files = res.data.files;
    callback(files);
  });
};

router.get('/', function(req, res, next) {
  const credentials = req.cookies.GOOGLE_CREDENTIALS;
  if (!credentials) {
    res.redirect('/get-token');
  }
  
  res.render('index');
});

router.get('/get-token', function(req, res, next) {
  res.render('getToken', { authUrl: authorizeUrl });
});

router.get('/oauth2callback', function(req, res, next) {
  const code = req.query.code;
  client.getToken(code, (err, tokens) => {
    if (err) {
      console.log('<<<< ERROR >>>>');
      res.redirect('/get-token');
    }
    client.credentials = tokens;
    res.cookie('GOOGLE_CREDENTIALS', tokens);
    res.redirect('/');
  });
  
});

router.get('/list', function(req, res, next) {
  client.credentials = req.cookies.GOOGLE_CREDENTIALS;
  listFiles(client, function(files) {
      res.json(files);
  });
});

module.exports = router;
