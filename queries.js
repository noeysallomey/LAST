var promise = require('bluebird'),
    pg = require('pg'),
    session = require ('express-session'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    nodemailer = require('nodemailer'),
    schedule = require('node-schedule');

var mode;

var express = require('express');
express.Router().use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
var options = {
  // Initialization Options
  promiseLib: promise
};

var pgp = require('pg-promise')(options);
//var connectionString = "postgres://inventory:&3c6u4o@127.0.0.1:5432/csu_app_inventory";
var connectionString = "postgres://postgres:12345@localhost:5432/trackimo";
var db = pgp(connectionString);

 

function check_user(req, res, next) {
  if(!(req.session.in)){
      console.log("USER NOT RECOGNIZED");
      res.redirect('/');
  }
  else
    next();
}

function login(req, res, next){
  console.log("login-page");
  if(req.session.in == "log" || (!req.session.in))
    res.render('login');
  else if(req.session.role == 'Admin')
    res.render('index', {user: req.session.user});
  else
    res.render('index', {user: req.session.user});
}

function userOut(req, res, next){
    console.log("logout");
    req.session.in = "log"

    res.redirect('/');
}

function userIn(req, res, next){
    console.log("login");
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from users WHERE username = ${username} AND password = crypt (${password}, password) AND role = 'Admin'", req.body),
            t.any("SELECT * from users WHERE username = ${username} AND password = crypt (${password}, password) AND role = 'Staff'", req.body),
            t.any("SELECT * from users WHERE username = ${username} AND password = crypt (${password}, password) AND role = 'Checker'", req.body)
        ]);
    })
    .then(function (data) {
        if(data[0].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.role = 'Admin';
            console.log("user is: " + req.session.user);
            res.redirect('/dashboard');
        } else if(data[1].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.role = 'Staff';
            console.log("user is: " + req.session.user);
            res.redirect('/dashboard');
        }  else if(data[2].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.role = 'Checker';
            console.log("user is: " + req.session.user);
            res.redirect('/dashboard');
        } else{
            res.render('login', {error: 'Incorrect credentials!'})
        }
    })
    .catch(function (err) {
      console.log("[USER-IN] " + err);
      return next(err);
    });
}

function dashing(req, res, next){
    console.log("dashboard");
    console.log("user is: " + req.session.user);

    if(!(req.session.in) || req.session.role == 'Staff')
        res.redirect('/');
    else{
        res.render('index', {user: req.session.user});
    } 
}


function renderAddCategory(req, res, next) {
    console.log("AddCategory Page");
    res.render('addCategory', {user: req.session.user});
}

function renderAddCategoryBatch(req, res, next) {
    console.log("AddCategory Page");
    res.render('addCategoryBatch', {user: req.session.user});
}

function newCategory(req, res, next) {
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO category(category_name) VALUES ($1)",
        [req.body.category_name], 
        function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
    });
    res.redirect('/dashboard');
  });
}

function newCategoryBatch(req, res, next) {
    var url = 'C:/Users/LAST';
    var url_add = url + '/' + req.body.file_name;
    console.log(url_add);
  db.task(function (t) {
        return t.batch([
            t.any("SELECT loaddataCategory($1)", url_add)
            ]);
  })
  .then(function (data, err) {
        res.redirect('/dashboard');

  });
}

function renderEditCategory(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {
        res.render('editCategory', {user: req.session.user});

  });
}

function editProperCategory(req, res, next) {

    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from category where category_id=${category}", req.body)
            ]);
    })
    .then(function (data) {
        res.render('updateCategoryProper', {category: data[0], user: req.session.user});
    })
    .catch(function(err) {
        console.log("[UPDATE-FINAL-CATEGORY] " + err);
        return next(err);
    });
}

function updateCategoryFinal(req, res, next) {
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE category SET category_name = $1 WHERE category_id = $2",
        [req.body.category_name,
         req.body.orig_category_id], 
        function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
    });
    res.redirect('/dashboard');
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderRemoveCategory(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {
        res.render('removeCategory', {category: data[0], user: req.session.user});

  });
}

function deleteCategoryFinal(req, res, next) {
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM category WHERE category_id = $1",
        [req.body.category], 
        function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
    });
    res.redirect('/dashboard');
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function displayCategory(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category_view ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {
        res.render('viewCategory', {category: data[0], user: req.session.user});

  });
}

function renderAddNiche(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {
        res.render('addNiche', {category: data[0], user: req.session.user});

  });
}

function newNiche(req, res, next) {
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO niche(niche_name, category_id) VALUES ($1, $2)",
        [req.body.niche_name,
         req.body.category], 
        function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
    });
    res.redirect('/dashboard');
  });
}

function renderEditNiche(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        res.render('editNiche', {niche: data[0], user: req.session.user});

  });
}

function editProperNiche(req, res, next) {

    db.task(function (t) {
        return t.batch([
            t.any("SELECT niche_name from  niche where niche_id=${niche}", req.body)
            ]);
    })
    .then(function (data) {
        res.render('updateNicheProper', {niche: data[0], user: req.session.user});
    })
    .catch(function(err) {
        console.log("[UPDATE-FINAL-Niche] " + err);
        return next(err);
    });
}

function chartRecent(req, res, next) {
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    var query = client.query('SELECT * FROM dummyReport ORDER BY 1');
  
    query.on('row', (row) => {
      results.push(row);
    });

    query.on('end', () => {
      res.json(results);
    });
  });
}

function chartInteractive(req, res, next) {
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    var query = client.query("SELECT * FROM monthlyReport");
  
    query.on('row', (row) => {
      results.push(row);
    });

    query.on('end', () => {
      res.json(results);
    });
  });
}

function renderChart(req, res, next){
  res.render('reportChart');
}

module.exports = {
    check_user:check_user,
    login:login,
    userIn:userIn,
    userOut:userOut,
    dashing:dashing,
    renderAddCategory:renderAddCategory,
    newCategory:newCategory,
    renderEditCategory:renderEditCategory,
    editProperCategory:editProperCategory,
    updateCategoryFinal:updateCategoryFinal,
    renderRemoveCategory:renderRemoveCategory,
    deleteCategoryFinal:deleteCategoryFinal,
    displayCategory:displayCategory,
    renderAddNiche:renderAddNiche,
    newNiche:newNiche,
    renderEditNiche:renderEditNiche,
    editProperNiche:editProperNiche,
    renderAddCategoryBatch:renderAddCategoryBatch,
    newCategoryBatch:newCategoryBatch,
    chartRecent:chartRecent,
    chartInteractive:chartInteractive
};