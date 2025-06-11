const Task = require("../models/Task");
const Project = require("../models/Project");

const emitToProjectRoom = (req, projectId, event, payload) => {
  const io = req.app.get("io");
  io.to(projectId).emit(event, payload);
  console.log(`Socket.IO event emitted: ${event} to project ${projectId}`);
};

const Notification = require("../models/Notification"); // Add this

exports.getNotifications = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const userId = req.user._id.toString();
    const allowedUserIds = project.members.map(m => m.toString());
    allowedUserIds.push(project.owner.toString());

    if (!allowedUserIds.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const notifications = await Notification.find({ project: projectId })
      .sort({ createdAt: -1 }) // optional: newest first
      .limit(50); // limit for performance

    res.json(notifications);
  } catch (err) {
    next(err);
  }
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
