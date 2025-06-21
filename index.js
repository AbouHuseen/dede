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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create new user with username
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const user = new User({ username });
    const savedUser = await user.save();

    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username').exec();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add exercise to user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;

    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If date not provided or invalid, use current date
    let exerciseDate;
    if (!date) {
      exerciseDate = new Date();
    } else {
      exerciseDate = new Date(date);
      if (exerciseDate.toString() === "Invalid Date") {
        exerciseDate = new Date();
      }
    }

    // Parse duration as number
    const durationNumber = Number(duration);
    if (isNaN(durationNumber)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }

    const exercise = new Exercise({
      userId,
      description,
      duration: durationNumber,
      date: exerciseDate
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get exercise logs with optional filters
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filter = { userId };

    // Date filtering: ensure valid dates
    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (fromDate.toString() !== "Invalid Date") {
          filter.date.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (toDate.toString() !== "Invalid Date") {
          filter.date.$lte = toDate;
        }
      }
    }

    let query = Exercise.find(filter).select('description duration date -_id').sort({ date: 'asc' });

    if (limit) {
      const limitNumber = parseInt(limit);
      if (!isNaN(limitNumber)) {
        query = query.limit(limitNumber);
      }
    }

    const exercises = await query.exec();

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
