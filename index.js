//Requires
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const app = express();


//Set global variables
let port = process.env.PORT || 8080;


//Allow app to use Public directory for CSS
app.use(express.static(__dirname + '/public'));
//Allow app to use body-parser
app.use(bodyParser.urlencoded({extended: true}));


//Set view engine to EJS
app.set('view engine', 'ejs');


//Session cookie
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 1000 * 60 * 60 * 24 }}));


//Mongo connection
MongoClient.connect('mongodb://admin:dbpassword@ds159489.mlab.com:59489/apptrack', function(err, database) {
    if (err) return console.log(err);
    db = database.db('apptrack');
    console.log('MongoDB connected');
})


//Homepage get request
app.get('/', function(req, res) {
    res.render('index.ejs');
});

//Login page get request
app.get('/login', function(req, res) {
    res.render('login.ejs');
});

//Register page get request
app.get('/register', function(req, res) {
    res.render('register.ejs');
});


//Login route
app.post('/login_auth', function(req, res) {
    //Read login request body
    let userLoginData = req.body;
    console.log(userLoginData);

        var usernameQuery = { username: userLoginData.username };
        db.collection("users").find(usernameQuery).toArray(function(err, result) {
            if (err) throw err;

            //Check to see if user exists
            if (result.length == 0) {
                console.log("User didn't exist");
                res.render('login', { errormsg: "There is no account with that username." });
            } else {
                //check hashed password
                let userPassCheck = bcrypt.compareSync(userLoginData.password, result[0].password);
                console.log(userPassCheck);
                //User does exist, check to see if password is correct
                if (userLoginData.username === result[0].username && userPassCheck === true) {
                    //Write username to cookie
                    req.session.userID = userLoginData.username;
                    //Redirect to dashboard
                    console.log("Successful login");
                    res.redirect('/dashboard');
                } else {
                    console.log("Bad password attempt");
                    res.render('login', { errormsg: "The password you have entered is incorrect." });
                }
            }

        });
});

//Logout route
app.get('/logout', function (req, res) {
    delete req.session.userID;
    console.log('Session has been removed. User logged out.');
    res.redirect('/');
});



//Dashboard get request
app.get('/dashboard', checkAuth, function(req, res) {
    console.log(req.session.userID);
    var usernameQuery = { username: req.session.userID };
    db.collection("users").find(usernameQuery).toArray(function(err, result) {
        if (err) throw err;

        let appListLength = Object.keys(result[0]).length - 3
        let appListData = Object.keys(result[0])

        console.log(appListLength);
        console.log(appListData);

        let hello1 = 5

        //console.log(result[0].appListData[i])

        //if (appListLength === 3) {
        //    console.log("No apps assigned to user")
        //} else {
        //    var i;
        //    for (i = 0; i < (appListLength - 3); i++) {
        //        //console.log(appListData[i]);
        //        //console.log(result[0][appListData[i]].trackName);
        //        let appdata = [result[0][appListData[i]].trackName, result[0][appListData[i]].nowprice, result[0][appListData[i]].addedprice, result[0][appListData[i]].artwork, result[0][appListData[i]].url, result[0][appListData[i]].rating];
        //        console.log(appdata);
        //    }
        //}
        res.render('dashboard.ejs', {data1: appListLength, data2: result, data3: appListData});

    });
})



//Listen server
app.listen(port, function() {
    console.log('Server started and listening on port ' + port);
});


//Check auth function
function checkAuth(req, res, next) {
    if (!req.session.userID) {
        //res.send('You are not authorized to view this page');
        res.redirect('/login');
    } else {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        next();
    }
}



//Register route
app.post('/register', function(req, res) {
    //Check to see if username already exists
    let userRegisterData = req.body;
    console.log(userRegisterData);
        var usernameQuery = { username: userRegisterData.username };
        db.collection("users").find(usernameQuery).toArray(function(err, result) {
            if (err) throw err;

            if (result.length == 0) {
                console.log("User didn't exist");
                    //Hash password
                    req.body.password = bcrypt.hashSync(req.body.password, 8);
                    db.collection('users').save(req.body, function(err, result) {
                        if (err) return console.log(err);
    
                        console.log('Saved to database')
                        req.session.userID = req.body.username;
                        //Redirect to dashboard
                        res.redirect('/dashboard');
                    }) 

            } else {
                console.log("Username already exists");
                //res.redirect('/register');
                res.render('register', { errormsg: "Username already exists. Please try again." });

            }

        })
})


//Add new app
app.post('/add_app', function(req, res) {
    let inputAppURL = req.body.inputappurl;
    request('https://itunes.apple.com/lookup?country=GB&id=' + inputAppURL, function (err, response, body) {
    if(err){
      //res.render('index', {weather: null, error: 'Error, please try again'});
      console.log('Error');
      res.redirect('/dashboard');
    } else {
        //console.log(body);
      let inputAppDetails = JSON.parse(body);
      console.log(inputAppURL);
      let query = { username: req.session.userID };

      //let newvalues =  [ {trackName: inputAppDetails.results[0].trackName, nowprice: inputAppDetails.results[0].price, addedprice: inputAppDetails.results[0].price, artwork: inputAppDetails.results[0].artworkUrl100, url: inputAppDetails.results[0].trackViewUrl, rating: inputAppDetails.results[0].averageUserRatingForCurrentVersion} ];
      let obj = {}
      obj[inputAppURL] = {trackName: inputAppDetails.results[0].trackName, nowprice: inputAppDetails.results[0].price, addedprice: inputAppDetails.results[0].price, artwork: inputAppDetails.results[0].artworkUrl100, url: inputAppDetails.results[0].trackViewUrl, rating: inputAppDetails.results[0].averageUserRatingForCurrentVersion}
      let newvalues = { $set: obj}


                  db.collection('users').updateOne(query, newvalues, function(err, result) {
                      if (err) return console.log(err);

                      console.log('Saved to database')
                      
                  }) 
                  res.redirect('/dashboard');

    }
  });
})




//DEV Clear database
app.get('/delete', function(req, res) {
    db.collection('users').remove({}, function(err, result) {
        if (err) return console.log(err);

        console.log('User database cleared');
        res.redirect('/');
    })
})




//res.send('Bad user/pass');
