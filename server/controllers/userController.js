const User = require("../models/User");
const Project = require("../models/Project");

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate("projects");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    // Optionally support query by project or role here
    const users = await User.find().populate("projects");
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { firebaseUid, name, email, role } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: "firebaseUid and email are required" });
    }

    // Only allow creating user if it doesn't exist yet
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) return res.status(409).json({ error: "User already exists" });

    const user = new User({ firebaseUid, name, email, role });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Only allow updating own user or if admin (owner)
    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

    if (currentUser._id.toString() !== userId) {
      // Check if currentUser is owner/admin, else forbid
      if (currentUser.role !== "owner") {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent changing firebaseUid and email for security
    delete updates.firebaseUid;
    delete updates.email;

    Object.assign(user, updates);
    await user.save();

    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Only owner can delete users
    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });
    if (currentUser.role !== "owner") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Optionally, remove user from all projects
    await Project.updateMany(
      { members: user._id },
      { $pull: { members: user._id } }
    );

    // Also remove ownership if any (you might want to handle project ownership transfer here)
    await Project.updateMany(
      { owner: user._id },
      { $unset: { owner: "" } }
    );

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ======= Project-scoped user management =======

exports.getUsersForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate("members owner");
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Authorization: only members or owner can list users
    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

    const allowedUserIds = project.members.map(m => m._id.toString());
    allowedUserIds.push(project.owner._id.toString());
    if (!allowedUserIds.includes(currentUser._id.toString())) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Return all members + owner as users array
    const users = [...project.members, project.owner];
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.addUserToProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body; // user to add to project

    if (!userId) return res.status(400).json({ error: "userId is required" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

    // Only project owner can add users
    if (project.owner.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ error: "Only owner can add users" });
    }

    if (project.members.includes(userId)) {
      return res.status(409).json({ error: "User is already a member" });
    }

    project.members.push(userId);
    await project.save();

    // Optionally, add project to user's projects array
    const userToAdd = await User.findById(userId);
    if (userToAdd && !userToAdd.projects.includes(projectId)) {
      userToAdd.projects.push(projectId);
      await userToAdd.save();
    }

    res.status(201).json({ message: "User added to project" });
  } catch (err) {
    next(err);
  }
};

exports.removeUserFromProject = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

    // Only owner can remove users
    if (project.owner.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ error: "Only owner can remove users" });
    }

    if (!project.members.includes(userId)) {
      return res.status(404).json({ error: "User is not a member of this project" });
    }

    project.members.pull(userId);
    await project.save();

    // Optionally remove project from user's projects array
    const userToRemove = await User.findById(userId);
    if (userToRemove) {
      userToRemove.projects.pull(projectId);
      await userToRemove.save();
    }

    res.json({ message: "User removed from project" });
  } catch (err) {
    next(err);
  }
};
