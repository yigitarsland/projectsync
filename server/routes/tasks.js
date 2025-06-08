const express = require('express');
const router = express.Router({ mergeParams: true });
const taskController = require('../controllers/taskController');

// Create a task under project
router.post('/', taskController.createTask);

// Update a task
router.put('/:taskId', taskController.updateTask);

// Delete a task
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
