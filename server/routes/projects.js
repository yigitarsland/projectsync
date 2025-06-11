const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middlewares/authenticate'); 

// Get all projects
router.get('/', projectController.getAllProjects); 

// Create new project
router.post('/', projectController.createProject);

// Get project by ID with populated members and tasks
router.get('/:projectId', projectController.getProjectById);

// Update project
router.put('/:projectId', projectController.updateProject);

// Delete project
router.delete('/:projectId', projectController.deleteProject);

// Get users
router.get('/:projectId/users', authMiddleware, projectController.getProjectUsers);

module.exports = router;
