
![My Logo](client/public/ProjectSync.png)

# ProjectSync: Collaborative Project Tracking Webapp

## Core Features

### Kanban Board:

Users can create projects and tasks, organized into columns (e.g., To Do, In Progress, Done).
Drag-and-drop tasks between columns.
Tasks have attributes like title, description, assignee, due date, and priority.

### Task Hierarchy:

Support nested tasks (subtasks) displayed in expandable tables or tree views.
Allow users to collapse/expand task hierarchies for better organization.

### Gantt Chart:

Visualize project timelines with task start/end dates and dependencies.
Highlight critical paths or overdue tasks.

### Progress Tracking:

Generate charts (e.g., pie chart for task completion, burndown chart for sprint progress).
Display project-level and team-level metrics.

### Real-Time Collaboration:

Update task statuses and board changes in real time for all team members.
Notify users of task assignments or comments via in-app notifications.

### User Authentication:

Support user roles (e.g., project manager, team member) with login functionality.

## Technologies

### Frontend:

- React.js: For a dynamic, component-based UI. 
- React-Beautiful-DnD: For drag-and-drop Kanban boards.
- Material-UI or Tailwind CSS: For responsive, polished styling.

### Charts and Visualizations:

- Chart.js: For Gantt charts, pie charts, and burndown charts.

### Real-Time:

- Socket.IO: For real-time task updates.
- Firebase: For real-time database and authentication as a simpler alternative.

### Backend:

- Node.js + Express: For REST API to manage projects, tasks, and users.
- MongoDB: For storing project and task data with nested structures.

### Authentication:

- Firebase Authentication : For secure user login with Google & Github options.
 
