const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['owner', 'member'], default: 'member' },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
},
{timestamps: true});

module.exports = mongoose.model('User', userSchema);
