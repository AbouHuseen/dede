const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS
app.use(cors());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: false }));

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// In-memory storage for users and exercises
const users = [];
const exercises = [];

// ✅ Create a new user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  const _id = Date.now().toString(); // Simple unique ID
  const newUser = { username, _id };

  users.push(newUser);
  res.json(newUser);
});

// ✅ Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// ✅ Add exercise to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  const user = users.find(u => u._id === userId);
  if (!user) return res.json({ error: 'User not found' });

  const exercise = {
    _id: userId,
    username: user.username,
    description: description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString()
  };

  exercises.push(exercise);
  res.json(exercise);
});

// ✅ Get user's exercise log with optional filters
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const user = users.find(u => u._id === userId);
  if (!user) return res.json({ error: 'User not found' });

  let userExercises = exercises.filter(e => e._id === userId);

  // Filter by 'from' date
  if (from) {
    const fromDate = new Date(from);
    userExercises = userExercises.filter(e => new Date(e.date) >= fromDate);
  }

  // Filter by 'to' date
  if (to) {
    const toDate = new Date(to);
    userExercises = userExercises.filter(e => new Date(e.date) <= toDate);
  }

  // Apply limit if provided
  if (limit) {
    userExercises = userExercises.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: userExercises.length,
    _id: user._id,
    log: userExercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date
    }))
  });
});

// ✅ Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
