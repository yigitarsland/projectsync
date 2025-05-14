const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // Use proper hashing in production
  name: { type: String, required: true },
  role: { type: String, enum: ['project_manager', 'team_member'], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);