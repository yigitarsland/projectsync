const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: String,
  completed: Boolean,
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['todo', 'inprogress', 'inreview', 'done'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  startDate: Date, // New field for task start date
  dueDate: Date,
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subtasks: [subtaskSchema],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, immutable: true }
},
{timestamps: true});

module.exports = mongoose.model('Task', taskSchema);