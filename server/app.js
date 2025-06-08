const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');             // <-- import cors
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

// Add CORS middleware here — configure with your frontend URL!
app.use(cors({
  origin: 'http://localhost:5173',  // <-- Replace with your frontend URL & port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true                 // <-- if you send cookies/auth headers
}));

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
