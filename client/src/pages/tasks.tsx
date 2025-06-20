// src/pages/tasks.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {InputAdornment, IconButton, Box, Card, CardContent, Typography, Chip, Avatar, AvatarGroup, 
         Button, Dialog, DialogTitle, DialogContent, DialogActions,
         TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Stack, ListItemText, Checkbox} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { getIdToken } from "../firebase/authUtils";
import { firebaseAuth } from '../firebase/firebaseConfig'; // adjust the path to where your config is

type Task = {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (renamed from date)
  status: "todo" | "inprogress" | "inreview" | "done";
  isEditing: boolean;
  priority: "low" |  "medium" | "high";
  assignees: User[]; 
};

type Column = {
  id: Task["status"];
  title: string;
  tasks: Task[];
  isAddingNew: boolean;
};

type User = {
  id: string;
  name: string;
  avatarUrl?: string;
};

const initialColumns: Column[] = [
  { id: "todo", title: "TO-DO", tasks: [], isAddingNew: false },
  { id: "inprogress", title: "IN PROGRESS", tasks: [], isAddingNew: false },
  { id: "inreview", title: "IN REVIEW", tasks: [], isAddingNew: false },
  { id: "done", title: "DONE", tasks: [], isAddingNew: false },
];

export default function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <Typography>No project selected.</Typography>;

  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE = "http://localhost:3000";

  const mapTask = (t: any): Task => ({
    id: t._id,
    title: t.title,
    description: t.description || "",
    startDate: t.startDate ? t.startDate.slice(0, 10) : "",
    dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    status: t.status,
    isEditing: false,
    priority: t.priority || "medium", // Default to medium
    assignees: (t.assignees || []).map((u: any) => ({ id: u._id, name: u.name })),
  });

  // Fetch tasks from backend
  const fetchTasks = async () => {
    if (!firebaseAuth.currentUser) {
      console.error("No authenticated user found. Cannot fetch tasks.");
      return;
    }

    try {
      const token = await getIdToken();
      console.log("ID token:", token); // Debug log to verify token presence

      const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const tasks = await res.json();
      setColumns(
        initialColumns.map((col) => ({
          ...col,
          tasks: tasks.filter((t: any) => t.status === col.id).map(mapTask),
        }))
      );
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    }
  };


  useEffect(() => {
    fetchTasks().catch(console.error);
    fetchUsers().catch(console.error);
  }, [projectId]);

  // API helpers
  const createTaskAPI = async (
    status: Task["status"],
    title: string,
    description: string,
    startDate: string,
    dueDate: string,
    priority: Task["priority"]
  ) => {
    const token = await getIdToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, startDate, dueDate, status, priority }),
    });
    if (!res.ok) throw new Error("Create failed");
    return mapTask(await res.json());
  };

  const updateTaskAPI = async (
    taskId: string,
    updates: Partial<Pick<Task, "title" | "description" | "startDate" | "dueDate" | "status" | "priority" | "assignees">>
  ) => {
    const token = await getIdToken();
    const body: any = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.startDate !== undefined) body.startDate = updates.startDate;
    if (updates.dueDate !== undefined) body.dueDate = updates.dueDate;
    if (updates.status !== undefined) body.status = updates.status;
    if (updates.priority !== undefined) body.priority = updates.priority;
    if (updates.assignees !== undefined) body.assignees = updates.assignees.map((u) => u.id); // Send IDs only

    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Update failed");
    return mapTask(await res.json());
  };

  const deleteTaskAPI = async (taskId: string) => {
    const token = await getIdToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Delete failed");
  };

  // Optimistic drag-and-drop
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcCol = columns.find((c) => c.id === source.droppableId)!;
    const dstCol = columns.find((c) => c.id === destination.droppableId)!;
    const srcTasks = Array.from(srcCol.tasks);
    const [moved] = srcTasks.splice(source.index, 1);

    if (srcCol.id === dstCol.id) {
      srcTasks.splice(destination.index, 0, moved);
      setColumns((cols) =>
        cols.map((c) => (c.id === srcCol.id ? { ...c, tasks: srcTasks } : c))
      );
    } else {
      const dstTasks = Array.from(dstCol.tasks);
      dstTasks.splice(destination.index, 0, moved);
      setColumns((cols) =>
        cols.map((c) => {
          if (c.id === srcCol.id) return { ...c, tasks: srcTasks };
          if (c.id === dstCol.id) return { ...c, tasks: dstTasks };
          return c;
        })
      );
      updateTaskAPI(moved.id, { status: dstCol.id }).catch((err) => {
        console.error("Failed to update task status", err);
        fetchTasks().catch(console.error);
      });
    }
  };

  const [allUsers, setAllUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}/projects/${projectId}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  setAllUsers(data.map((u: any) => ({ id: u._id, name: u.name })));
  };

  // Handlers for add/delete/edit
  const onAddNewClick = (columnId: string) =>
    setColumns((cols) =>
      cols.map((c) =>
        c.id === columnId ? { ...c, isAddingNew: true } : c
      )
    );

  const onSaveNewTask = async (
    columnId: string,
    title: string,
    description: string,
    startDate: string,
    dueDate: string,
    priority: Task["priority"]
  ) => {
    if (!title.trim()) return;
    try {
      const newTask = await createTaskAPI(columnId as any, title, description, startDate, dueDate, priority);
      setColumns((cols) =>
        cols.map((c) =>
          c.id === columnId
            ? { ...c, tasks: [newTask, ...c.tasks], isAddingNew: false }
            : c
        )
      );
    } catch (err: any) {
      console.error("Error creating task", err);
      alert(`Error creating task: ${err.message}`);
    }
  };

  const onCancelNewTask = (columnId: string) =>
    setColumns((cols) =>
      cols.map((c) =>
        c.id === columnId ? { ...c, isAddingNew: false } : c
      )
    );

  const onDeleteTask = async (columnId: string, taskId: string) => {
    try {
      await deleteTaskAPI(taskId);
      setColumns((cols) =>
        cols.map((c) =>
          c.id === columnId
            ? { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }
            : c
        )
      );
    } catch (err: any) {
      console.error("Error deleting task", err);
      alert(`Error deleting task: ${err.message}`);
    }
  };

  const onStartEditing = (columnId: string, taskId: string) => {
    setColumns((cols) =>
      cols.map((c) =>
        c.id === columnId
          ? {
              ...c,
              tasks: c.tasks.map((t) =>
                t.id === taskId ? { ...t, isEditing: true } : t
              ),
            }
          : c
      )
    );
  };

  const onSaveEditTask = async (
    columnId: string,
    taskId: string,
    newTitle: string,
    newDesc: string,
    newStartDate: string,
    newDueDate: string,
    newPriority: Task["priority"],
    newAssignees: User[]
  ) => {
    try {
      const updated = await updateTaskAPI(taskId, {
        title: newTitle,
        description: newDesc,
        startDate: newStartDate,
        dueDate: newDueDate,
        priority: newPriority,
        assignees: newAssignees,
      });
      setColumns((cols) =>
        cols.map((c) =>
          c.id === columnId
            ? {
                ...c,
                tasks: c.tasks.map((t) =>
                  t.id === taskId
                    ? { ...updated, isEditing: false }
                    : t
                ),
              }
            : c
        )
      );
    } catch (err: any) {
      console.error("Error updating task", err);
      alert(`Error updating task: ${err.message}`);
    }
  };

   const onCancelEditTask = (columnId: string, taskId: string) =>
    setColumns((cols) =>
      cols.map((c) =>
        c.id === columnId
          ? {
              ...c,
              tasks: c.tasks.map((t) =>
                t.id === taskId ? { ...t, isEditing: false } : t
              ),
            }
          : c
      )
    );

  // Inline new-task input
  const NewTaskInput: React.FC<{ columnId: string }> = ({ columnId }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");  
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState<Task["priority"]>("medium");

  return (
    <Card variant="outlined" sx={{ mt: 1, mb: 1 }}>
      <CardContent>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          size="small"
          autoFocus
          margin="dense"
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          multiline
          minRows={2}
        />
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
        <FormControl fullWidth size="small" margin="dense">
          <InputLabel id={`priority-label-${columnId}`}>Priority</InputLabel>
          <Select
            labelId={`priority-label-${columnId}`}
            value={priority}
            label="Priority"
            onChange={(e) => setPriority(e.target.value as Task["priority"])}
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <IconButton onClick={() => onCancelNewTask(columnId)}>
            <CancelIcon />
          </IconButton>
          <IconButton
            onClick={() => onSaveNewTask(columnId, title, description, startDate, dueDate, priority)}
            disabled={!title.trim()}
          >
            <SaveIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

  // Render
  return (
    <>
      {/* Search */}
      <Box sx={{ p: 2, width: "20vw", mr: "auto" }}>
        <TextField
          label="Search tasks"
          variant="outlined"
          fullWidth
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: "flex", gap: 2, p: 2, height: "100vh", width: "100%" }}>
          {columns.map((col) => (
            <Box key={col.id} sx={{ flex: 1, maxWidth: 320, minWidth: 280 }}>
              {/* Header */}
                <Box
                  sx={{ display: "flex", alignItems: "center", px: 2, py: 1, fontWeight: "bold" }}
                  onMouseEnter={() => setHoveredColumn(col.id)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    {col.title} ({col.tasks.length})
                  </Box>
                  {hoveredColumn === col.id && (
                    <IconButton
                      size="small"
                      onClick={() => onAddNewClick(col.id)}
                    >
                      <AddIcon />
                    </IconButton>
                  )}
                </Box>

              {/* New Task */}
              {col.isAddingNew && <NewTaskInput columnId={col.id} />}

              {/* Task List */}
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ flexGrow: 1, overflowY: "auto", px: 1, py: 1 }}>
                    {col.tasks
                      .filter((t) =>
                        !searchTerm
                          ? true
                          : t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.description.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(prov, snapshot) => {
                            // Local edit fields
                            const [editTitle, setEditTitle] = useState(task.title);
                            const [editDesc, setEditDesc] = useState(task.description);
                            const [editStartDate, setEditStartDate] = useState(task.startDate);
                            const [editDueDate, setEditDueDate] = useState(task.dueDate);
                            const [editPriority, setEditPriority] = useState<Task["priority"]>(task.priority);
                            const [editAssignees, setEditAssignees] = useState<User[]>(task.assignees);

                            const getPriorityColor = (p: Task["priority"]) =>
                              p === "high" ? "red" : p === "medium" ? "orange" : "green";

                            const MAX_AVATARS = 3;
                            const extraCount = task.assignees.length - MAX_AVATARS;
                            const avatarsToShow = task.assignees.slice(0, MAX_AVATARS);

                            return (
                              <Box
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                sx={{ position: "relative", opacity: snapshot.isDragging ? 0.8 : 1, mb: 1 }}
                                onMouseEnter={() => setHoveredTaskId(task.id)}
                                onMouseLeave={() => setHoveredTaskId(null)}
                              >
                                {/* Delete */}
                                {hoveredTaskId === task.id && !task.isEditing && (
                                  <IconButton size="small" sx={{ position: "absolute", top: 4, right: 4, zIndex: 10 }} onClick={() => onDeleteTask(col.id, task.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}

                                {/* Editing Mode */}
                                {task.isEditing ? (
                                  <Card variant="outlined">
                                    <CardContent>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        margin="dense"
                                        label="Title"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                      />
                                      <TextField
                                        fullWidth
                                        size="small"
                                        margin="dense"
                                        label="Description"
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                      />
                                      <TextField
                                        fullWidth
                                        size="small"
                                        margin="dense"
                                        label="Start Date"
                                        type="date"
                                        value={editStartDate}
                                        onChange={(e) => setEditStartDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                      />
                                      <TextField
                                        fullWidth
                                        size="small"
                                        margin="dense"
                                        label="Due Date"
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                      />
                                      <FormControl fullWidth size="small" margin="dense">
                                        <InputLabel id={`edit-priority-label-${task.id}`}>Priority</InputLabel>
                                        <Select
                                          labelId={`edit-priority-label-${task.id}`}
                                          value={editPriority}
                                          label="Priority"
                                          onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
                                        >
                                          <MenuItem value="low">Low</MenuItem>
                                          <MenuItem value="medium">Medium</MenuItem>
                                          <MenuItem value="high">High</MenuItem>
                                        </Select>
                                      </FormControl>

                                      {/* Assignees Multi-Select */}
                                      <FormControl fullWidth size="small" margin="dense">
                                        <InputLabel id={`edit-assignees-label-${task.id}`}>Assignees</InputLabel>
                                        <Select
                                          labelId={`edit-assignees-label-${task.id}`}
                                          multiple
                                          value={editAssignees.map((a) => a.id)}
                                          onChange={(e) => {
                                            const selectedIds = e.target.value as string[];
                                            const selectedUsers = allUsers.filter((u) => selectedIds.includes(u.id));
                                            setEditAssignees(selectedUsers);
                                          }}
                                          renderValue={(selected) => {
                                            const names = (selected as string[])
                                              .map((id) => allUsers.find((u) => u.id === id)?.name)
                                              .filter(Boolean);
                                            return names.join(", ");
                                          }}
                                        >
                                          {allUsers.map((user) => (
                                            <MenuItem key={user.id} value={user.id}>
                                              <Checkbox checked={editAssignees.some((a) => a.id === user.id)} />
                                              <ListItemText primary={user.name} />
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>

                                      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                                        <IconButton size="small" onClick={() => onCancelEditTask(col.id, task.id)}>
                                          <CancelIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            onSaveEditTask(col.id, task.id, editTitle, editDesc, editStartDate, editDueDate, editPriority, editAssignees)
                                          }
                                        >
                                          <SaveIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                  
                                ) : (
                                  
                                  /* Display Mode */
                                  <Card
                                    onDoubleClick={() => onStartEditing(col.id, task.id)}
                                    sx={{
                                      p: 1,
                                      cursor: "pointer",
                                      border: "1px solid",
                                      borderColor: getPriorityColor(task.priority),
                                      // Optionally a subtle shadow or rounded corners
                                      boxShadow: 1,
                                      borderRadius: 1,
                                      position: "relative" // To position avatars absolute inside card
                                    }}
                                  >
                                    <Typography fontWeight="bold">{task.title}</Typography>
                                    <Typography variant="body2" noWrap>
                                      {task.description}
                                    </Typography>
                                    {task.dueDate && (
                                      <Typography variant="caption">Due: {task.dueDate}</Typography>
                                    )}
                                    <Typography
                                      variant="caption"
                                      sx={{ display: "block", mt: 0.5, color: getPriorityColor(task.priority) }}
                                    >
                                      Priority: {task.priority}
                                    </Typography>
                                    {/* Avatar Stack */}
                                    <Stack
                                      direction="row"
                                      spacing={-0.5}
                                      sx={{
                                        position: "absolute",
                                        bottom: 4,
                                        right: 4,
                                        zIndex: 10,
                                      }}
                                    >
                                      {avatarsToShow.map((user) => (
                                        <Avatar
                                          key={user.id}
                                          alt={user.name}
                                          src={user.avatarUrl}
                                          sx={{ width: 24, height: 24, border: '2px solid white', fontSize: 12 }}
                                        />
                                      ))}

                                      {extraCount > 0 && (
                                        <Avatar
                                          sx={{
                                            width: 24,
                                            height: 24,
                                            fontSize: 12,
                                            bgcolor: 'grey.500',
                                            border: '2px solid white',
                                          }}
                                        >
                                          +{extraCount}
                                        </Avatar>
                                      )}
                                    </Stack>

                                  </Card>
                                )}
                              </Box>
                            );
                          }}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          ))}
        </Box>
      </DragDropContext>
    </>
  );
}
