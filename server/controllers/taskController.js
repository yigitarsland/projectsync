const Task = require("../models/Task");
const Project = require("../models/Project");

const emitToProjectRoom = (req, projectId, event, payload) => {
  const io = req.app.get("io");
  io.to(projectId).emit(event, payload);
  console.log(`Socket.IO event emitted: ${event} to project ${projectId}`);
};

// New: get tasks with permission check
exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate({
      path: "tasks",
      populate: { path: "assignees", select: "name email" },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user._id.toString();
    const allowedUserIds = project.members.map((m) => m.toString());
    allowedUserIds.push(project.owner.toString());

    if (!allowedUserIds.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(project.tasks);
  } catch (err) {
    next(err);
  }
};

// Old: get tasks without permission check
exports.getTasksForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate({
      path: "tasks",
      populate: { path: "assignees", select: "name email" },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    res.json(project.tasks);
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      startDate,
      dueDate,
      assigneeId,
      subtasks,
      dependencies,
    } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user._id.toString();

    if (project.owner.toString() !== userId) {
      return res.status(403).json({ error: "Only project owner can create tasks" });
    }

    // Validate dates if provided
    if (startDate && dueDate) {
      const start = new Date(startDate);
      const due = new Date(dueDate);
      if (isNaN(start.getTime()) || isNaN(due.getTime())) {
        return res.status(400).json({ error: "Invalid startDate or dueDate" });
      }
      if (start > due) {
        return res.status(400).json({ error: "startDate cannot be after dueDate" });
      }
    }

    const task = new Task({
      title,
      description,
      status: "todo",
      startDate,
      dueDate,
      assignees: assigneeId
        ? Array.isArray(assigneeId)
          ? assigneeId
          : [assigneeId]
        : [],
      subtasks: subtasks || [],
      dependencies: dependencies || [],
      project: projectId,
    });

    await task.save();

    project.tasks.push(task._id);
    await project.save();

    emitToProjectRoom(req, projectId, "taskCreated", { task });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

const Notification = require("../models/Notification"); // Add this at the top

exports.updateTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const updates = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const userId = req.user._id.toString();
    const allowedUserIds = project.members.map((m) => m.toString());
    allowedUserIds.push(project.owner.toString());

    if (!allowedUserIds.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const isOwner = project.owner.toString() === userId;
    const originalTask = task.toObject(); // snapshot for comparison

    if (!isOwner) {
      if (!("status" in updates) || Object.keys(updates).length !== 1) {
        return res.status(403).json({
          error: "Only the status field can be updated by members",
        });
      }
      task.status = updates.status;
    } else {
      if ("project" in updates) delete updates.project;
      Object.assign(task, updates);
    }

    await task.save();

    // Notification logic
    const changes = [];
    if (originalTask.title !== task.title) {
      changes.push(`Title changed to "${task.title}"`);
    }
    if (originalTask.description !== task.description) {
      changes.push(`Description updated`);
    }
    if (originalTask.dueDate?.toISOString() !== task.dueDate?.toISOString()) {
      changes.push(`Due date changed to ${new Date(task.dueDate).toLocaleDateString()}`);
    }
    if (originalTask.status !== task.status) {
      changes.push(`Status changed to ${task.status}`);
    }

    for (const change of changes) {
      await Notification.create({
        project: project._id,
        task: task._id,
        message: `Task "${task.title}": ${change}`,
      });
    }

    emitToProjectRoom(req, projectId, "taskUpdated", { task });

    res.json(task);
  } catch (err) {
    next(err);
  }
};


exports.deleteTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user._id.toString();

    if (project.owner.toString() !== userId) {
      return res.status(403).json({ error: "Only the project owner can delete tasks" });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.project && task.project.toString() !== projectId) {
      return res.status(403).json({ error: "Task does not belong to this project" });
    }

    await Task.findByIdAndDelete(taskId);

    project.tasks.pull(taskId);
    await project.save();

    emitToProjectRoom(req, projectId, "taskDeleted", { taskId });

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
};
