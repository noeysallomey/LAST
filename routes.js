var express = require('express'),
    app = express(),
    session = require ('express-session');
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');

var router = express.Router();
//var chartData = require('./chart.js');

var db = require('./queries');

router.use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
// var web = require('./webpages');

//web routes

router.get('/', db.login);                                  ////
router.get('/logout', db.check_user, db.userOut);
router.post('/login', db.userIn);
router.get('/dashboard', db.check_user, db.dashing);
/* DONE */router.get('/addCategory', db.check_user, db.renderAddCategory);
/* DONE */router.get('/addCategoryBatch', db.check_user, db.renderAddCategoryBatch);
/* DONE */router.get('/removeCategory', db.check_user, db.renderRemoveCategory);
/* DONE */router.post('/confirmAdd', db.check_user, db.newCategory);
/* DONE */router.post('/confirmAddBatch', db.check_user, db.newCategoryBatch);
/* DONE */router.get('/editCategory', db.check_user, db.renderEditCategory);
/* DONE */router.post('/searchCategoryForEdit', db.check_user, db.editProperCategory);
/* DONE */router.post('/updateCategoryFinal', db.check_user, db.updateCategoryFinal);
/* DONE */router.post('/deleteCategory', db.check_user, db.deleteCategoryFinal);
/* DONE */router.get('/viewCategory', db.check_user, db.displayCategory);

/* NICHE */
/* DONE */router.get('/addNiche', db.check_user, db.renderAddNiche);
/* DONE */router.post('/confirmAddNiche', db.check_user, db.newNiche);
/* DONE */router.get('/editNiche', db.check_user, db.renderEditNiche);
/* DONE */router.post('/searchNicheForEdit', db.check_user, db.editProperNiche);

//CHARTJS
router.get('/recentReportChart', db.chartRecent);
router.get('/interactiveChart', db.chartInteractive);
/*router.get('/thisChart', db.renderChart); */


//error-handling
router.get('*', function(err, req, res, next) {
  console.log("get ***");
  res.render('pagenotfound');
});

router.use('*',function(err, req, res, next) {
  console.log("OOPS! " + err.message);
  res.render('pagenotfound');
});

module.exports = router;
