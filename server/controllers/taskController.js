const Task = require("../models/Task");
const Project = require("../models/Project");

exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate({
      path: "tasks",
      populate: { path: "assignees", select: "name email" }
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const user = req.user;

    const allowedUserIds = project.members.map((m) => m.toString());
    allowedUserIds.push(project.owner.toString());
    if (!allowedUserIds.includes(user._id.toString())) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(project.tasks);
  } catch (err) {
    next(err);
  }
};

exports.getTasksForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate({
      path: "tasks",
      populate: { path: "assignees", select: "name email" }
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
    const { title, description, startDate, dueDate, assigneeId, subtasks, dependencies } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const user = req.user;

    // Only project owner can create tasks
    if (project.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only project owner can create tasks' });
    }

    // Validate startDate and dueDate if provided
    if (startDate && dueDate) {
      const start = new Date(startDate);
      const due = new Date(dueDate);
      if (isNaN(start.getTime()) || isNaN(due.getTime())) {
        return res.status(400).json({ error: "Invalid startDate or dueDate" });
      }
      if (start > due) {
        return res.status(400).json({ error: "startDate cannot be after dueDate" });
      }
    } else if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid startDate" });
      }
    } else if (dueDate) {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) {
        return res.status(400).json({ error: "Invalid dueDate" });
      }
    }

    const task = new Task({
      title,
      description,
      status: "todo",
      startDate, // Include startDate
      dueDate,
      assignees: assigneeId
        ? Array.isArray(assigneeId)
          ? assigneeId
          : [assigneeId]
        : [],
      subtasks: subtasks || [],
      dependencies: dependencies || [],
      project: projectId
    });

    await task.save();

    project.tasks.push(task._id);
    await project.save();

    // Emit real-time update via Socket.IO
    const io = req.app.get("io");
    io.to(projectId).emit("taskCreated", { task });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const updates = req.body;

    console.log("Received update for task:", taskId);
    console.log("Update payload:", updates);

    const project = await Project.findById(projectId);
    if (!project) {
      console.log("Project not found:", projectId);
      return res.status(404).json({ error: "Project not found" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      console.log("Task not found:", taskId);
      return res.status(404).json({ error: "Task not found" });
    }

    const user = req.user;

    console.log("Current user:", user._id.toString());
    console.log("Project owner:", project.owner.toString());
    console.log("Project members:", project.members.map(m => m.toString()));

    const allowedUserIds = project.members.map((m) => m.toString());
    allowedUserIds.push(project.owner.toString());
    if (!allowedUserIds.includes(user._id.toString())) {
      console.log("User not allowed to update task");
      return res.status(403).json({ error: "Forbidden" });
    }

    const isOwner = project.owner.toString() === user._id.toString();

    // Validate startDate and dueDate if provided in updates
    if (updates.startDate || updates.dueDate) {
      const start = updates.startDate ? new Date(updates.startDate) : task.startDate;
      const due = updates.dueDate ? new Date(updates.dueDate) : task.dueDate;
      if (start && isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid startDate" });
      }
      if (due && isNaN(due.getTime())) {
        return res.status(400).json({ error: "Invalid dueDate" });
      }
      if (start && due && start > due) {
        return res.status(400).json({ error: "startDate cannot be after dueDate" });
      }
    }

    if (!isOwner) {
      if (!("status" in updates) || Object.keys(updates).length !== 1) {
        return res
          .status(403)
          .json({ error: "Only the status field can be updated by members" });
      }
      task.status = updates.status;
    } else {
      if ("project" in updates) delete updates.project;

      Object.assign(task, updates);
    }

    console.log("Task after applying updates:", task);

    try {
      await task.save();
    } catch (saveError) {
      console.error("Task save failed:", saveError);
      return res.status(400).json({ error: "Update failed", details: saveError.message });
    }

    const io = req.app.get("io");
    io.to(projectId).emit("taskUpdated", { task });

    res.json(task);
  } catch (err) {
    console.error("Unexpected error updating task:", err);
    next(err);
  }
};

exports.deleteTask = async (req, res) => {
  const { projectId, taskId } = req.params;

  try {
    // Step 1: Ensure project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const user = req.user;

    if (project.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only the project owner can delete tasks' });
    }

    // Step 2: Get the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Step 3: Validate task belongs to project
    if (task.project && task.project.toString() !== projectId) {
      return res
        .status(403)
        .json({ error: "Task does not belong to this project" });
    }

    // Step 4: Delete task
    await Task.findByIdAndDelete(taskId);

    // Step 5: Remove reference from project
    project.tasks.pull(taskId);
    await project.save();

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};