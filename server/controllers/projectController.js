const Project = require('../models/Project');
const User = require('../models/User');

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({}, 'id name'); // Or select fields you want to send
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.createProject = async (req, res, next) => {
  try {
    // Find or create user document
    let user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      user = new User({
        firebaseUid: req.user.uid,
        email: req.user.email,
        name: req.user.email.split('@')[0],
      });
      await user.save();
    }

    const { name, description } = req.body;

    const project = new Project({
      name,
      description,
      owner: user._id,
      members: [user._id],
      tasks: []
    });

    await project.save();

    user.projects.push(project._id);
    await user.save();

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .populate('tasks');

    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json(project);
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Check ownership
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user || project.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: Only owner can update' });
    }

    const { name, description } = req.body;
    if (name) project.name = name;
    if (description) project.description = description;

    await project.save();

    res.json(project);
  } catch (err) {
    next(err);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user || project.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: Only owner can delete' });
    }

    await project.remove();

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};
