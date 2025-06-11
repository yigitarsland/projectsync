const express = require('express');
const router = express.Router({ mergeParams: true });
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authenticate');

// All routes require auth
router.use(authMiddleware);

// Old function: get all tasks for project (no user permission check)
router.get('/all', taskController.getTasksForProject);

// New function: get tasks for project with permission check
router.get('/', taskController.getTasks);

// Create a task under project
router.post('/', taskController.createTask);

// Update a task
router.put('/:taskId', taskController.updateTask);

// Delete a task
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
