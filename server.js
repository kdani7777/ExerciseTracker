const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useNewUrlParser: true }, (err, database) => {
  if(err) return err;
  var db = database;
});

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//Athlete Schema
var athleteSchema = new mongoose.Schema({
  username: {type: String, required: true},
  userCount: {type: Number, required: true}, //keep incremented numbers until you figure out how to get mongodb _id
  exerciseLog: [{
    description: String,
    duration: Number,
    date: Date
  }]//makes exercise log an array
});

//Athlete model
var Athlete = mongoose.model('Athlete', athleteSchema);

var countIncrementer = 1;

//create and save new user
app.post('/api/exercise/new-user', function(req, res) {
  
  var new_user = new Athlete({ username: req.body.username, 
                               userCount: countIncrementer,
                               exerciseLog: [{description: null, duration: null, date: null}] });
  //var temp = new_user._id;
  new_user.save(function(err) {
    if(err) return err;
  });
  
  res.json({username: req.body.username, _id: new_user._id});
  countIncrementer++; 
});

//add exercise sessions to log
app.post('/api/exercise/add', function(req, res) {
  
  var userId = req.body.userId;
  var username; //NEED TO LEARN ABOUT CURSORS TO SOLVE ISSUE
  
  var exerciseSession = {description: req.body.description, duration: req.body.duration,
                         date: req.body.date ? req.body.date : new Date()
                        };
  Athlete.findByIdAndUpdate(userId, { '$push': { 'exerciseLog': exerciseSession } }, {new: true},
    function(err, data) {
      if(err) return err;
      console.log(data);
      data.save((err) => err);
  });

  res.json({username: 'solve later', description: req.body.description, duration: req.body.duration,
            _id: userId, date: req.body.date} );
});

//get user's exercise log
app.get('/api/exercise/log', function(req, res) {
  if(req.query.userId) {
    Athlete.findById(req.query.userId, function(err, data) { 
      
      if(req.query.from && req.query.to) {
        if(req.query.limit) {
          res.json(data.exerciseLog.filter(element => 
                                             new Date(element.date) >= new Date(req.query.from) && 
                                             new Date(element.date) <= new Date(req.query.to)).slice(0, req.query.limit));
        } else {
            res.json(data.exerciseLog.filter(element => 
                                             new Date(element.date) >= new Date(req.query.from) && 
                                             new Date(element.date) <= new Date(req.query.to)));
            }
          /*line below does not work becuase data.exerciseLog is an array, not an object
          res.json(data.exerciseLog.find({ $and: [{date: { $gte: req.query.from }}, {date: { $lte: req.query.to }}] })); */
      } else {
      res.json(data.exerciseLog);
      }
    });
  } else {
    res.send("No userId specified. Please try again.");
  }
});





//---------------------------------------------------------------------------


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
