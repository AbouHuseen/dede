const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Home Page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create new user
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const savedUser = await user.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users);
});

// Add exercise to user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  });

  const savedExercise = await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: savedExercise.date.toDateString(),
    duration: savedExercise.duration,
    description: savedExercise.description
  });
});

// Get exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  let filter = { userId: user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter).select('-_id description duration date');
  if (limit) query = query.limit(parseInt(limit));

  const exercises = await query.exec();
  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }))
  });
});

// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
