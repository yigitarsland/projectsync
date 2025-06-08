const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const authenticate = require('./middlewares/authenticate');

const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

const app = express();

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

app.use(morgan('combined'));
app.use(express.json());

// Firebase auth middleware for all routes
app.use(authenticate);

// Routes
app.use('/projects', projectRoutes);
app.use('/projects/:projectId/tasks', taskRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
