const fs = require("fs");
const path = require("path");
var paypal = require("paypal-rest-sdk");
var cors = require("cors");
var User = require('../config/models/user');
var Token = require('../config/models/tokenVerification');
var PaymentLogs = require("../config/models/payment_logs");
var questions = require("../config/models/question");
const emailer = require('../emailer/impl');
var crypto = require('crypto');

const IPFS = require('ipfs-http-client')

var ejs=require('ejs');
const ipfs = new IPFS({
  host: 'ipfs.xinfin.network',
  port: 443,
  protocol: 'https'
})

/*paypal.configure({
 mode: "sandbox", //sandbox or live
  client_id:    "AR8oYc8pYp90H_9qN6JcjvSgS5nbCq_hFvc5ue4Twzdh-ZefahoeLmVKEem2OxbLNlK2nM-Zv74F3iPI",
  client_secret: "ELBjQfb3aGNze4S-wbaHHndGmv4DQzqfOoeu1NAphrOwdwxHSjaHLR_zP-u4hBLGJPAyCXdTPAFD8BKk"
});*/

paypal.configure({
  mode: "live", //sandbox or live
  client_id:
    "ActAo_owzENeRQct8dgkXOZ4c1U_adE_i0JOph3QjJWLHWbSrj8bY0bYjn98F06moUhTAJYuJ6i8sKKX",
  client_secret:
    "EGqCuRXqjli8HXdL83rvOro4xZMGjQ2B7kIy6Mh0JWfX3iXqNnPekQ_WNNhtI7_Z5ZphG4r16Oy188Ya"
});

const utils = require("../utils.js");
let { readJSONFile, isLoggedIn } = utils;

module.exports = function (app, passport) {
  var isPaymentSuccess = async function(req, res, next ) {
    if(req.isAuthenticated()) {
      const backUrl = req.url;
      const examName = backUrl.split('/')[1].split('-')[1];
      const email = req.user.local.email;
      let payment_status;
      console.log('ispaymentsuccess', examName  )
      if (examName === "basic") {
        await User.findOne({ "local.email": email }, function (err, user) {
          payment_status = user.local.payment.course_1;
          if(payment_status != true) {
            res.redirect('/exams');
          } else {
            next();
          }
        });
      } else if (examName === "advanced"){
        await User.findOne({ "local.email": email }, function (err, user){
          payment_status = user.local.payment.course_2;
          if(payment_status != true) {
            res.redirect('/exams');
          } else {
            next();
          }
        });
      } else if (examName === "professional") {
        await User.findOne({ "local.email": email }, function (err, user) {
          payment_status = user.local.payment.course_3;
          if(payment_status != true) {
            res.redirect('/exams');
          } else {
            next();
          }
        });
      }
    } else {
      console.log('game of thrones')
    }
  }

  app.post("/login", (req, res, next) => {
    passport.authenticate(
      "local-login",
      {
        session: true
      },
      async (err, user, info) => {
        console.log('login1111>>>>>>', user)
        req.logIn(user, function (err) {
          if (err) {
             //return next(err);
           console.log('login err>>>>>>>>>>>', err)
          }
          res.send({ status: user, message: info });
          console.log("user logged in", user, info);
        });
      }
    )(req, res, next);
  });

  app.post("/forgotPassword", (req, res,) => {
    User.findOne({ 'local.email': req.body.email }).then(result => {
      console.log('ankit', result)
      if (result == null) {
        res.send("User not found")
        console.log('ankit', result)

      } else if (result.local.password == null) {
        res.send("Password")
      } else {
        emailer.forgotPasswordMailer(result.local.email,result.local.password, res);
        
      }
    })
  }),

  app.post("/resetPassword", (req, res) => {
    console.log(req.body)
    console.log("ankit patel", result)
    User.findOne({
      where: {
        'local.email': req.body.email
      }
    }).then(result => {
      if (!bcrypt.compareSync(result.dataValues.uniqueId, req.body.resetId)) { console.log("false") }
      else {
        console.log("true")
        res.render("resetPassword", { email: result.dataValues.email })
      }
    })
  }),

  app.post('/updatePassword', (req, res) => {
    console.log('fcgvhj',req.body)
    var data = JSON.stringify(req.body);
    var dataupdate = JSON.parse(data);
    console.log(data,dataupdate);
    const backUrl = req.header('Referer');
    userobj = new User();
    hash = userobj.generateHash(dataupdate.password);
    console.log("body:",dataupdate.password, backUrl.email)
    User.findOneAndUpdate({ 'local.password': dataupdate.token},{"local.password":hash}, {upsert: false},(err, doc) => {
      if (err) {
        console.log("Something went wrong when updating data!",err);
        res.send({ status: 'false', message: info });
      }
      res.redirect('/');
    });
  }),
  

  // app.get('/auth/google', (req, res, next) => {
  //   passport.authenticate('google', {
  //     scope: ["profile", "email"]
  //   })
  // });

  // app.get('/auth/google/callback', (req, res, next) => {
  //    passport.authenticate('google', {
  //      successRedirect: '/blockchain-basic-exam',
  //      failureRedirect: '/'
  //    })
  //  })
 

 app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  // callback route for google to redirect to
  app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login',
    successRedirect: '/'
  }));
  // callback route for github to redirect to

  app.get('/auth/github', passport.authenticate('github', {
    scope: ['profile', 'email']
  }));

  app.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect: '/',
    failureRedirect: '/login'
  }));




  app.post("/register", (req, res, next) => {
    passport.authenticate(
      "local-signup",
      {
        session: true
      },
      async (err, user, info) => {
        res.send({ status: user, message: info });
      }
    )(req, res, next);
  });

  app.get("/logout", function (req, res) {
    req.logout();
    req.session.destroy(function (err) {
      if (err) { return next(err); }
      res.redirect("/");
    });
  });

  app.get("/courses/:courseName", isLoggedIn, function (req, res) {
    switch (req.params.courseName) {
      case "blockchain-basic":
        res.redirect("/courses/blockchain-basic/history-of-blockchain");
        break;
      case "blockchain-advanced":
        res.redirect(
          "/courses/blockchain-advanced/what-is-blockchain-and-bitcoin"
        );
        break;
      case "blockchain-professional":
        res.redirect(
          "/courses/blockchain-professional/what-is-ethereum-blockchain"
        );
    }
  });

  app.get("/courses/:courseName/:content", isLoggedIn, function (req, res) {
    res.sendFile(
      path.join(
        process.cwd(),
        "/server/protected/courses/" +
        req.params.courseName +
        "/" +
        req.params.content +
        ".html"
      )
    );
  });

  app.get("/exams", isLoggedIn, function (req, res) {
    // Populate with the course exam data
    /***
      Recommended exam data structure: [{
        title: string,
        price: int,
        writeup/copy: string
      }]
      ***/
     console.log('local exam ');

    User.findOne({ "local.email": req.user.local.email }, function (err, user) {
      if(err) { throw err };
      readJSONFile(
        path.join(process.cwd(), "/dist/data/courses.json"),
        (err, json) => {
          if (err) {
            throw err;
          }

          const examListData = {
            'data': {
              "course_1": user.local.payment.course_1,
              "course_2": user.local.payment.course_2,
              "course_3": user.local.payment.course_3,
            },
            'json': json
          }
          console.log('examlist data:::', examListData)
          res.render("examList", examListData);
        }
      );
    });


    // readJSONFile(
    //   path.join(process.cwd(), "/dist/data/courses.json"),
    //   (err, json) => {
    //     if (err) {
    //       throw err;
    //     }
    //     res.render("examList", json);
    //   }
    // );
  });

  // Need logic on on click, redirection with course id

  // app.get("/exam", function(req, res) {
  //   let examQns;

  //   readJSONFile(
  //     path.join(process.cwd(), "/server/protected/exams.json"),
  //     (err, json) => {
  //       if (err) {
  //         throw err;
  //       }
  //       console.log("test quetions:", json);
  //       res.render("examList", json);
  //     }
  //   );
  // });



  app.post("/answers", (req, res, next) => {
    // check the verification of user answers
    console.log(req.body); // Answers are send as {'0': 'q0-c0', '1': 'q1-c2'}
    // return the score
    res.send("got the answers");
  });

  app.post("/signup", (req, res, next) => {
    passport.authenticate(
      "local-signup",
      {
        session: true
      },
      async (err, user, info) => {
        res.send({ status: user, message: info });
      }
    )(req, res, next);
  });

  app.post("/pay", isLoggedIn, cors(), async (req, res) => {
    var price = req.body.price;
    var email = req.user.local.email;
    var course_id = req.body.course_id;
    var payment_status;

    await User.findOne({ "local.email": email }, function (err, user) {
      if (course_id == "course_1") {
        payment_status = user.local.payment.course_1;
      } else if (course_id == "course_2") {
        payment_status = user.local.payment.course_2;
      } else if (course_id == "course_3") {
        payment_status = user.local.payment.course_3;
      }
    });

    if (payment_status != true) {
      invoice_number = "TXID" + Date.now() + (Math.floor(Math.random() * 1000) + 9999);
      var payReq = JSON.stringify({
        intent: "order",
        payer: {
          payment_method: "paypal"
        },
        redirect_urls: {
			return_url: "http://www.blockdegree.org/suc",
			cancel_url: "http://www.blockdegree.org/err"
          //return_url: "http://localhost:3000/suc",
          //cancel_url: "http://localhost:3000/err"
        },
        transactions: [
          {
            amount: {
              total: price,
              currency: "USD",
              details: {
                subtotal: price,
                tax: "0.0"
              }
            },
            description: email,
            invoice_number: invoice_number,
            payment_options: {
              allowed_payment_method: "INSTANT_FUNDING_SOURCE"
            },
            item_list: {
              items: [
                {
                  name: course_id,
                  quantity: "1",
                  price: price,
                  tax: "0.0",
                  sku: "123123",
                  currency: "USD"
                }
              ]
            }
          }
        ]
      });

      paypal.payment.create(payReq, function (error, payment) {
        var links = {};

        if (error) {
          console.error(JSON.stringify(error));
        } else {
          // Capture HATEOAS links
          payment.links.forEach(function (linkObj) {
            links[linkObj.rel] = {
              href: linkObj.href,
              method: linkObj.method
            };
          });

          // If redirect url present, redirect user
          if (links.hasOwnProperty("approval_url")) {
            // REDIRECT USER TO links['approval_url'].href;

            var payment_logs = new PaymentLogs();
            payment_logs.email = email;
            payment_logs.course_id = course_id;
            payment_logs.payment_id = invoice_number;
            payment_logs.payment_status = false;
            payment_logs.amount = price;
            payment_logs.save();

            return res.send({
              status: "200",
              link: links["approval_url"].href
            });
          } else {
            console.error("no redirect URI present");
          }
        }
      });
    } else {
      return res.send({ status: "400", message: "Payment already completed." });
      // res.redirect("/courses/blockchain-basic/history-of-blockchain");
    }
  });

  app.get("/suc", function (req, res, next) {
    var paymentId = req.query.paymentId;
    var payerId = { payer_id: req.query.PayerID };
    var order;

    paypal.payment.execute(paymentId, payerId, function (error, payment) {
      if (error) {
        console.error(JSON.stringify(error));
      } else {
        if (
          payment.state === "approved" &&
          payment.transactions &&
          payment.transactions[0].related_resources &&
          payment.transactions[0].related_resources[0].order
        ) {
          console.log("order authorization completed successfully");
          // Capture order id
          order = payment.transactions[0].related_resources[0].order.id;
          console.log(payment.transactions[0].description);
          var email = payment.transactions[0].description;
          var course_id = payment.transactions[0].item_list.items[0].name;
          var invoice_number = payment.transactions[0].invoice_number;
          var capture_details = {
            amount: {
              currency: payment.transactions[0].amount.currency,
              total: payment.transactions[0].amount.total
            }
          };
          //take payment
          paypal.order.authorize(order, capture_details, function (error, authorization) {
            if (error) {
              console.error(JSON.stringify(error));
            } else {
              paypal.order.capture(order, capture_details, function (
                error,
                capture
              ) {
                if (error) {
                  console.error(error);
                } else {
                  console.log("ORDER CAPTURE SUCCESS");
                  User.findOne({ "local.email": email }, function (err, user) {
                    if (course_id == "course_1")
                      user.local.payment.course_1 = true;
                    else if (course_id == "course_2")
                      user.local.payment.course_2 = true;
                    else if (course_id == "course_3")
                      user.local.payment.course_3 = true;
                    user.save();
                    PaymentLogs.findOne(
                      { payment_id: invoice_number, email: email },
                      function (err, payment_log) {
                        payment_log.payment_status = true;
                        payment_log.save();
                      }
                    );
                  });
                  console.log('course_id', course_id, email);
                  emailer.sendTokenMail(email, '', req, course_id);
                  res.redirect("/payment-success");
                }
              });
            }
          });
        } else {
          console.log("payment not successful");
          res.send({ error: error });
        }
      }
    });
  });

  app.get('/exam-result', isLoggedIn, function (req, res) {
    const backUrl = req.header('Referer');
    const examName = backUrl.split('/')[3].split('-')[1];
    if (examName === "basic") {
      User.findOne({ 'local.email': req.user.local.email}).then((result, error) => {
        console.log('result basic:', result, error);
        const examTotal = 50;
        let obtainedMarks = result.local.examBasic.marks;
        
        let percent = (obtainedMarks * 100) / examTotal;
        let examStatus;
        let jsonData = {
          "exam": {
            "examBasic": true,
            "examAdvanced": false,
            "examProfessional": false
          },
          "data": result,
          "obtainedMarks": obtainedMarks,
          "percent": percent,
        };
        if(percent >= 60) {
          User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examBasic.attempts":0,"local.payment.course_1": false}}, {upsert: false},(err, doc) => {
            if (err) {
              console.log("Something went wrong when updating data!");
              res.send({ status: 'false', message: info });
            }
            // res.redirect('/exam-result');
          });
          examStatus = true;
          let d = new Date();
          let date = d.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
          });
          ejs.renderFile(__dirname+'/certificate.ejs', {
            name:  req.user.local.email,
            course: "Certified Blockchain Basic Expert",
            score: percent,
            date: date
          }, (err, data) => {
            let buffer = Buffer.from(data, 'utf-8');
            ipfs.add(buffer, (err, ipfsHash) => {
              console.log(ipfsHash);
              result.certificateHash=ipfsHash[0].hash;
              jsonData.certificateHash=ipfsHash[0].hash;
              jsonData.examStatus= examStatus;
              result.save();
              res.render('examResult', jsonData);
            });
          })

        } else if (percent < 60) {
          examStatus = false;
          jsonData.examStatus= examStatus;
          res.render('examResult', jsonData);
        }

        console.log('examResult json:', jsonData)

      });
    } else if (examName === "advanced") {
      User.findOne({ 'local.email': req.user.local.email}).then((result, error) => {
        console.log('result advanced:', result, error);
        const examTotal = 50;
        let obtainedMarks = result.local.examAdvanced.marks;
        let percent = (obtainedMarks * 100) / examTotal;
        let examStatus;
        let jsonData = {
          "exam": {
            "examBasic": false,
            "examAdvanced": true,
            "examProfessional": false
          },
          "data": result,
          "obtainedMarks": obtainedMarks,
          "percent": percent,
        };

        if(percent >= 60) {
          User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examAdvanced.attempts":0,"local.payment.course_2": false}}, {upsert: false},(err, doc) => {
            if (err) {
              console.log("Something went wrong when updating data!");
              res.send({ status: 'false', message: info });
            }
            // res.redirect('/exam-result');
          });
          examStatus = true;
          let d = new Date();
          let date = d.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
          });
          ejs.renderFile(__dirname+'/certificate.ejs', {
            name:  req.user.local.email,
            course: "Certified Bitcoin Blockchain Expert",
            score: percent,
            date: date
          }, (err, data) => {
            let buffer = Buffer.from(data, 'utf-8');
            ipfs.add(buffer, (err, ipfsHash) => {
              console.log(ipfsHash);
              result.certificateHash=ipfsHash[0].hash;
              jsonData.certificateHash=ipfsHash[0].hash;
              jsonData.examStatus= examStatus;
              result.save();
              res.render('examResult', jsonData);
            });
          })

        } else if (percent < 60) {
          examStatus = false;
          jsonData.examStatus= examStatus;
          res.render('examResult', jsonData);
        }

        console.log('examResult json:', jsonData)

      });
    } else if (examName === "professional") {
      User.findOne({ 'local.email': req.user.local.email}).then((result, error) => {
        console.log('result professional:', result, error);
        const examTotal = 50;
        let obtainedMarks = result.local.examProfessional.marks;
        console.log('obtainedMarks>>>>>>>', obtainedMarks)
        let percent = (obtainedMarks * 100) / examTotal;
        let examStatus;
        let jsonData = {
          "exam": {
            "examBasic": false,
            "examAdvanced": false,
            "examProfessional": true
          },
          "data": result,
          "obtainedMarks": obtainedMarks,
          "percent": percent,
        };
        if(percent >= 60) {
          User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examProfessional.attempts":0,"local.payment.course_3": false}}, {upsert: false},(err, doc) => {
            if (err) {
              console.log("Something went wrong when updating data!");
              res.send({ status: 'false', message: info });
            }
            // res.redirect('/exam-result');
          });
          examStatus = true;
          let d = new Date();
          let date = d.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
          });
          ejs.renderFile(__dirname+'/certificate.ejs', {
            name:  req.user.local.email,
            course: "examProfessional",
            score: percent,
            date: date
          }, (err, data) => {
            let buffer = Buffer.from(data, 'utf-8');
            ipfs.add(buffer, (err, ipfsHash) => {
              console.log(ipfsHash);
              result.certificateHash=ipfsHash[0].hash;
              jsonData.certificateHash=ipfsHash[0].hash;
              jsonData.examStatus= examStatus;
              result.save();
              res.render('examResult', jsonData);
            });
          })

        } else if (percent < 60) {
          examStatus = false;
          jsonData.examStatus= examStatus;
          res.render('examResult', jsonData);
        }

        console.log('examResult json:', jsonData)

      });
    }
  });

  app.get('/payment-success', isLoggedIn, function(req, res) {
    res.render('paymentSuccess');
  });

  app.get('/blockchain-basic-exam', isPaymentSuccess, function (req, res) {
    readJSONFile(path.join(process.cwd(), '/server/protected/blockchain-basic.json'), (err, json) => {
      if (err) { throw err; }
      console.log('test quetions basic:', json);
      res.render('blockchainBasic', json)
    })
  });

  app.get('/blockchain-advanced-exam', isPaymentSuccess, function (req, res) {
    readJSONFile(path.join(process.cwd(), '/server/protected/blockchain-advanced.json'), (err, json) => {
      if (err) { throw err; }
      console.log('test quetions advanced:', json);
      res.render('blockchainAdvanced', json)
    })
  });

  app.get('/blockchain-professional-exam', isPaymentSuccess, function (req, res) {
    console.log('inside block prof')
    readJSONFile(path.join(process.cwd(), '/server/protected/blockchain-professional.json'), (err, json) => {
      console.log('block pro 2', err, json)
      if (err) { throw err; }
      console.log('test quetions professional:', json);
      res.render('blockchainProfessional', json)
    })
  });

  app.post("/postExam", isLoggedIn, function (req, res, next) {
    var marks = 0;
    const backUrl = req.header('Referer');
    const examName = backUrl.split('/')[3].split('-')[1];
    console.log(req.user);
    console.log(req.user.local.examBasic.attempts);
    const request = JSON.parse(JSON.stringify(req.body, null, 2));
    console.log('requestffff', examName);
    let attempts = req.user.local.examBasic.attempts;
    let attemptsAdvanced = req.user.local.examAdvanced.attempts;
    let attemptsProfessional = req.user.local.examProfessional.attempts;
    if (examName === "basic") {
      if (attempts != null && attempts < 3 ) {
        questions.findOne({ exam: "firstExam" }).then((result, error) => {
          for (let index = 0; index < result.questionsBasic.length; index++) {
            if (parseInt(request[index]) + 1 == result.questionsBasic[index].answer) {
              marks++;
            }
          }
          attempts += 1;
          User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examBasic.attempts":attempts,"local.examBasic.marks":marks}}, {upsert: false},(err, doc) => {
            if (err) {
              console.log("Something went wrong when updating data!");
              res.send({ status: 'false', message: info });
            }
            res.redirect('/exam-result');
          });
        });
      } else if(attempts >= 3) {
        attempts = 0;
        User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examBasic.attempts":attempts,"local.examBasic.marks":marks,"local.payment.course_1": false}}, {upsert: false},(err, doc) => {
          if (err) {
            console.log("Something went wrong when updating data!");
            res.send({ status: 'false', message: info });
          }
          res.redirect('/exam-result');
        });
      }
    } else if (examName === "advanced") {
      if (attemptsAdvanced != null && attemptsAdvanced < 3 ) {
        questions.findOne({ exam: "firstExam" }).then((result, error) => {
          console.log('advanced result', result);
          console.log('advanced result:::', result.questionsAdvanced)
          for (let index = 0; index < result.questionsAdvanced.length; index++) {
            if (parseInt(req.body[index]) + 1 == result.questionsAdvanced[index].answer) {
              marks++;
            }
          }
          attemptsAdvanced += 1;
          console.log("Marks", marks);
          User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examAdvanced.attempts":attemptsAdvanced,"local.examAdvanced.marks":marks}}, {upsert: false},(err, doc) => {
            if (err) {
              console.log("Something wrong when updating data!");
            }
            console.log(doc);
            res.redirect('/exam-result');
          });
        });
      } else if (attemptsAdvanced >= 3) {
        attemptsAdvanced = 0;
        User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examAdvanced.attempts":attemptsAdvanced,"local.examAdvanced.marks":marks,"local.payment.course_2": false}}, {upsert: false},(err, doc) => {
          if (err) {
            console.log("Something went wrong when updating data!");
            res.send({ status: 'false', message: info });
          }
          res.redirect('/exam-result');
        });
      }
    } else if (examName === "professional") {
      if (attemptsProfessional != null && attemptsProfessional < 3 ) {
        questions.findOne({ exam: "firstExam" }).then((result, error) => {
          for (let index = 0; index < result.questionsProfessional.length; index++) {
            if (parseInt(request[index]) + 1 == result.questionsProfessional[index].answer) {
              marks++;
            }
          }
          attemptsProfessional += 1;
          console.log("Marks", marks);
          User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examProfessional.attempts":attemptsProfessional, "local.examProfessional.marks":marks}}, {upsert: false},(err, doc) => {
            console.log('err?', err)
            if (err) {
              console.log("Something wrong when updating data!");
            }
            res.redirect('/exam-result');
          });
        });
      } else if (attemptsProfessional >= 3) {
        attemptsProfessional = 0;
        User.findOneAndUpdate({ 'local.email': req.user.local.email},{$set:{"local.examProfessional.attempts":attemptsProfessional,"local.examProfessional.marks":marks,"local.payment.course_3": false}}, {upsert: false},(err, doc) => {
          console.log('err2?', err)
          if (err) {
            console.log("Something went wrong when updating data!");
            res.send({ status: 'false', message: info });
          }
          res.redirect('/exam-result');
        });
      }
    }


  });



  app.get('/confirmation', function (req, res) {
    // Find a matching token
    // res.send('login')
    console.log("In confirmation", req.query.token);
    Token.findOne({ token: req.query.token }, function (err, token) {
      if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });
      console.log("token mapped email:", token.email)
      // If we found a token, find a matching user
      User.findOne({ "local.email": token.email }, function (err, user) {
        if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
        if (user.local.isVerified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

        // Verify and save the user
        user.local.isVerified = true;
        user.save(function (err) {
          if (err) { console.log("ajdgakc", err.message); return res.status(500).send({ msg: err.message }); }
          console.log("Success");
          // res.status(200).send("The account has been verified. Please log in.");
          res.redirect(200, '/login')
        });
      });
    });
  });


  app.post('/resend', function (req, res, next) {
    console.log('resend>>>>>>>>>>')
    User.findOne({ email: req.body.email }, function (err, user) {
      if (!user) return res.status(400).send({ msg: 'We were unable to find a user with that email.' });
      if (user.isVerified) return res.status(400).send({ msg: 'This account has already been verified. Please log in.' });

      // Create a verification token, save it, and send email
      var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

      // Save the token
      token.save(function (err) {
        if (err) { return res.status(500).send({ msg: err.message }); }

        // Send the email
        emailer.sendTokenMail(req.body.email, token, req, 'resend');
      });

    });
  });
};
