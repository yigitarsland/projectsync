const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: String,
  completed: Boolean,
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, default: 'todo' }, 
  dueDate: Date,
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subtasks: [subtaskSchema],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }]
});

module.exports = mongoose.model('Task', taskSchema);
