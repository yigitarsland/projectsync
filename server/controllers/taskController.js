const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate('tasks');
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user is member or owner
    const allowedUserIds = project.members.map(m => m.toString());
    allowedUserIds.push(project.owner.toString());
    if (!allowedUserIds.includes(user._id.toString())) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(project.tasks);
  } catch (err) {
    next(err);
  }
};

exports.getTasksForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('tasks');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // send back just the array of task documents
    res.json(project.tasks);
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate, assigneeId, subtasks, dependencies } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user is member or owner
    const allowedUserIds = project.members.map(m => m.toString());
    allowedUserIds.push(project.owner.toString());
    if (!allowedUserIds.includes(user._id.toString())) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const task = new Task({
      title,
      description,
      status: 'todo',
      dueDate,
      assignee: assigneeId || null,
      subtasks: subtasks || [],
      dependencies: dependencies || []
    });

    await task.save();

    project.tasks.push(task._id);
    await project.save();

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    io.to(projectId).emit('taskCreated', { task });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const updates = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const allowedUserIds = project.members.map(m => m.toString());
    allowedUserIds.push(project.owner.toString());
    if (!allowedUserIds.includes(user._id.toString())) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    Object.assign(task, updates);
    await task.save();

    const io = req.app.get('io');
    io.to(projectId).emit('taskUpdated', { task });

    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const allowedUserIds = project.members.map(m => m.toString());
    allowedUserIds.push(project.owner.toString());
    if (!allowedUserIds.includes(user._id.toString())) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove task from project's tasks array
    project.tasks = project.tasks.filter(tid => tid.toString() !== taskId);
    await project.save();

    await task.remove();

    const io = req.app.get('io');
    io.to(projectId).emit('taskDeleted', { taskId });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};
