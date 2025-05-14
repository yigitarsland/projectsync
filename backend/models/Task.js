const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, default: 'To Do' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
});

const taskSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'To Do' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  startDate: { type: Date },
  subtasks: [subtaskSchema],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
});

module.exports = mongoose.model('Task', taskSchema);