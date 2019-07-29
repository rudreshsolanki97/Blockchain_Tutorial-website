var twit = require("twit");
var ipfsClient = require("ipfs-http-client");
var puppeteer = require("puppeteer");
var fs = require("fs");
const User = require("../models/user");
const axios = require("axios");
const curl = new (require("curl-request"))();
var exec = require("child_process").exec;
var FormData = require("form-data");

require("dotenv").config();

const xinfinClient = new ipfsClient({
  host: "ipfs.xinfin.network",
  port: 443,
  protocol: "https"
});

const localClient = new ipfsClient("/ip4/127.0.0.1/tcp/5001");

exports.postTwitter = async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (!user) {
    res.redirect("/login");
  }
  if (
    user.auth.twitter.token == "" ||
    user.auth.twitter.token == undefined ||
    user.auth.twitter.tokenSecret == "" ||
    user.auth.twitter.tokenSecret == undefined
  ) {
    res.redirect("/auth/linkedin");
  }
  var config = getTwitterConfig(
    process.env.TWITTER_CLIENT_ID,
    process.env.TWITTER_CLIENT_SECRET,
    user.auth.twitter.token,
    user.auth.twitter.tokenSecret
  );
  var T = new twit(config);
  var imgHTML = "";

  localClient.get(req.body.hash, (err, files) => {
    if (err) {
      res.json({ uploaded: false, error: err });
    }
    files.forEach(async file => {
      var localPath = "tmp/" + file.path + ".png";
      imgHTML = file.content.toString("utf-8");
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setViewport({
        width: 960,
        height: 760,
        deviceScaleFactor: 1
      });
      await page.setContent(imgHTML);
      await page.screenshot({ path: localPath });
      browser.close().then(() => {
        var b64content = fs.readFileSync(localPath, { encoding: "base64" });
        // User should be able to set the status for post
        T.post("media/upload", { media_data: b64content }, function(
          err,
          data,
          response
        ) {
          if (err) {
            console.log("ERROR:");
            console.log(err);
          } else {
            T.post(
              "statuses/update",
              {
                status:
                  "Hey, I just got certified in blockchain from Blockdegree.org !!",
                media_ids: new Array(data.media_id_string)
              },
              function(err, data, response) {
                if (err) {
                  console.log("ERROR: ", err);
                } else {
                  console.log("Posted the status!");
                }
              }
            );
          }
        });
        fs.unlink(localPath, err => {
          if (err != null) {
            console.log("Error while deleting te temp-file at: ", localPath);
            res.json({ uploaded: true, error: null });
          }
        });
      });
    });
  });
};

exports.postLinkedin = async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (!user) {
    res.redirect("/login");
  }
  if (
    user.auth.linkedin.accessToken == "" ||
    user.auth.linkedin.accessToken == undefined ||
    user.auth.linkedin.id == "" ||
    user.auth.linkedin.id == undefined
  ) {
    res.redirect("/auth/linkedin");
  }
  const msg =
    req.body.msg ||
    "Hey I just completed this awesome course on blockchain, check it out blockdegree.org !!";
  const response = await axios({
    method: "post",
    url: "https://api.linkedin.com/v2/ugcPosts",
    headers: {
      "X-Restli-Protocol-Version": "2.0.0",
      Authorization: `Bearer ${user.auth.linkedin.accessToken}`
    },
    data: {
      author: `urn:li:person:${user.auth.linkedin.id}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: msg
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    }
  });
  console.log(response);
  res.send(response);
};

exports.uploadImageLinkedin = async (req, res) => {
  const authToken =
    "AQUKu3weSiEovLSgn6Pf3a5Kk064ZXLbR7Bu4AuJwR_-q5kR4h1aTe1cNFE9ybc6rUr2F3Teeo2qFY6-a3GjhS8zyySmTXVHOwF5t8UJBKHG8l8f6_o_-7VE_Yiz99Jnii7FhtIYMuGpojdiSXucbV6HWeU-hTKz-RCzFdhCIliz_lvsb1bE2Ih6fEi3qDGxFTSwmgRpjRhhGTBwujCwGODAGXDumhGfyq7snzAZ6vNiRGHh3D1XR5ewEVHAnEOJ-uket8Wo5Riq0eSFtRrwHSmmJZx4YsHZNfcdIBfhUu3ggSyxD_p-IiooOcMvK0TURxPZqw_3fvsbgrnbMVOZ4XI6LJe0WA";
  var response = await axios({
    method: "post",
    url: "https://api.linkedin.com/v2/assets?action=registerUpload",
    headers: {
      "X-Restli-Protocol-Version": "2.0.0",
      Authorization: `Bearer ${authToken}`
    },
    data: {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: "urn:li:person:-FqORa2gNz",
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent"
          }
        ]
      }
    }
  });

  // const uploadURL = response.data.value;
  const uploadMechnism =
    response.data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ];
  const uploadURL = uploadMechnism.uploadUrl;
  const asset = response.data.value.asset;

  console.log("ASSET: ", asset);
  console.log("UploadURL : ", uploadURL);

  // exec(`curl -i --upload-file /home/rudresh/test.png --header "Authorization: Bearer ${authToken}" '${uploadURL}'`,(err,stdout,stderr) => {
  //   if (err!=null){
  //     throw err
  //   }
  // })

  exec(`http POST ${uploadURL}  @/home/rudresh/test.png "Authorization:Bearer ${authToken}"`);




  const resp = await axios({
    method: "post",
    url: "https://api.linkedin.com/v2/ugcPosts",
    headers: {
      "X-Restli-Protocol-Version": "2.0.0",
      Authorization: `Bearer AQUKu3weSiEovLSgn6Pf3a5Kk064ZXLbR7Bu4AuJwR_-q5kR4h1aTe1cNFE9ybc6rUr2F3Teeo2qFY6-a3GjhS8zyySmTXVHOwF5t8UJBKHG8l8f6_o_-7VE_Yiz99Jnii7FhtIYMuGpojdiSXucbV6HWeU-hTKz-RCzFdhCIliz_lvsb1bE2Ih6fEi3qDGxFTSwmgRpjRhhGTBwujCwGODAGXDumhGfyq7snzAZ6vNiRGHh3D1XR5ewEVHAnEOJ-uket8Wo5Riq0eSFtRrwHSmmJZx4YsHZNfcdIBfhUu3ggSyxD_p-IiooOcMvK0TURxPZqw_3fvsbgrnbMVOZ4XI6LJe0WA`
    },
    data: {
      author: "urn:li:person:-FqORa2gNz",
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text:
              "Feeling inspired after meeting so many talented individuals at this year's conference. #talentconnect"
          },
          shareMediaCategory: "NONE",
          media: [
            {
              status: "READY",
              description: {
                text: "Center stage!"
              },
              media: asset,
              title: {
                text: "LinkedIn Talent Connect 2018"
              }
            }
          ]
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    }
  }).catch(err => {
    throw err;
  });
  console.log(resp.status);
};

// urn:li:digitalmediaAsset:C5122AQGhQP0CaqFy0Q
// https://api.linkedin.com/mediaUpload/C5122AQGhQP0CaqFy0Q/feedshare-uploadedImage/0?ca=vector_feedshare&cn=uploads&m=AQI8zuih7FoSBwAAAWw99KEmX49-ic5bOYLgDL7s5U4Txdw4O0tGr9rihQ&app=8015375&sync=0&v=beta&ut=2AT8nijBFOSoQ1

// const resp =await axios({
//       method: "post",
//       url: "https://api.linkedin.com/v2/ugcPosts",
//       headers: {
//         "X-Restli-Protocol-Version": "2.0.0",
//         Authorization: `Bearer AQUKu3weSiEovLSgn6Pf3a5Kk064ZXLbR7Bu4AuJwR_-q5kR4h1aTe1cNFE9ybc6rUr2F3Teeo2qFY6-a3GjhS8zyySmTXVHOwF5t8UJBKHG8l8f6_o_-7VE_Yiz99Jnii7FhtIYMuGpojdiSXucbV6HWeU-hTKz-RCzFdhCIliz_lvsb1bE2Ih6fEi3qDGxFTSwmgRpjRhhGTBwujCwGODAGXDumhGfyq7snzAZ6vNiRGHh3D1XR5ewEVHAnEOJ-uket8Wo5Riq0eSFtRrwHSmmJZx4YsHZNfcdIBfhUu3ggSyxD_p-IiooOcMvK0TURxPZqw_3fvsbgrnbMVOZ4XI6LJe0WA`
//       },
//       data: {
//         "author": "urn:li:person:-FqORa2gNz",
//         "lifecycleState": "PUBLISHED",
//         "specificContent": {
//             "com.linkedin.ugc.ShareContent": {
//                 "shareCommentary": {
//                     "text": "Feeling inspired after meeting so many talented individuals at this year's conference. #talentconnect"
//                 },
//                 "shareMediaCategory": "IMAGE",
//                 "media": [
//                     {
//                         "status": "READY",
//                         "description": {
//                             "text": "Center stage!"
//                         },
//                         "media": `${asset}`,
//                         "title": {
//                             "text": "LinkedIn Talent Connect 2018"
//                         }
//                     }
//                 ]
//             }
//         },
//         "visibility": {
//             "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
//         }
//     }
//     }).catch(err => {console.error(err)});
//  console.log(resp)

// res.json()
// };

function getTwitterConfig(consumerKey, consumerSecret, token, tokenSecret) {
  return {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
    access_token: token,
    access_token_secret: tokenSecret
  };
}