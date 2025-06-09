// src/pages/tasks.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {InputAdornment, IconButton, Box, Card, CardContent, Typography, Chip, Avatar, AvatarGroup, 
         Button, Dialog, DialogTitle, DialogContent, DialogActions,
         TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { getIdToken } from "../firebase/authUtils";

type Task = {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  status: "todo" | "inprogress" | "inreview" | "done";
  isEditing: boolean;
  priority: "low" |  "medium" | "high";
};

type Column = {
  id: Task["status"];
  title: string;
  tasks: Task[];
  isAddingNew: boolean;
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
    date: t.dueDate ? t.dueDate.slice(0, 10) : "",
    status: t.status,
    isEditing: false,
    priority: t.priority || "medium" // Default to medium 
  });

  // Fetch tasks from backend
  const fetchTasks = async () => {
    const token = await getIdToken();
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
  };

  useEffect(() => {
    fetchTasks().catch(console.error);
  }, [projectId]);

  // API helpers
  const createTaskAPI = async (
    status: Task["status"],
    title: string,
    description: string,
    date: string,
    priority: Task["priority"]
  ) => {
    const token = await getIdToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, dueDate: date, status, priority }), 
    });
    if (!res.ok) throw new Error("Create failed");
    return mapTask(await res.json());
  };


  const updateTaskAPI = async (
    taskId: string,
    updates: Partial<Pick<Task, "title" | "description" | "date" | "status" | "priority">>
  ) => {
    const token = await getIdToken();
    const body: any = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.date !== undefined) body.dueDate = updates.date;
    if (updates.status !== undefined) body.status = updates.status;
    if (updates.priority !== undefined) body.priority = updates.priority;
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
      // reorder same column
      srcTasks.splice(destination.index, 0, moved);
      setColumns((cols) =>
        cols.map((c) => (c.id === srcCol.id ? { ...c, tasks: srcTasks } : c))
      );
    } else {
      // move between columns
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
    date: string,
    priority: Task["priority"]
  ) => {
    if (!title.trim()) return;
    try {
      const newTask = await createTaskAPI(columnId as any, title, description, date, priority);
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
    newDate: string,
    newPriority: Task["priority"]
  ) => {
    try {
      const updated = await updateTaskAPI(taskId, {
        title: newTitle,
        description: newDesc,
        date: newDate,
        priority: newPriority,
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
    const [date, setDate] = useState("");
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
          label="Due Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
            onClick={() => onSaveNewTask(columnId, title, description, date, priority)}
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
                            const [editDate, setEditDate] = useState(task.date);
                            const [editPriority, setEditPriority] = useState<Task["priority"]>(task.priority);

                            const getPriorityColor = (p: Task["priority"]) =>
                              p === "high" ? "red" : p === "medium" ? "orange" : "green";

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
                                      <TextField fullWidth size="small" margin="dense" label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                      <TextField fullWidth size="small" margin="dense" label="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                                      <TextField fullWidth size="small" margin="dense" label="Due Date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} InputLabelProps={{ shrink: true }} />
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
                                      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                                        <IconButton size="small" onClick={() => onCancelEditTask(col.id, task.id)}><CancelIcon fontSize="small" /></IconButton>
                                        <IconButton size="small" onClick={() => onSaveEditTask(col.id, task.id, editTitle, editDesc, editDate, editPriority)}><SaveIcon fontSize="small" /></IconButton>
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
                                    }}
                                  >
                                    <Typography fontWeight="bold">{task.title}</Typography>
                                    <Typography variant="body2" noWrap>
                                      {task.description}
                                    </Typography>
                                    {task.date && (
                                      <Typography variant="caption">Due: {task.date}</Typography>
                                    )}
                                    <Typography
                                      variant="caption"
                                      sx={{ display: "block", mt: 0.5, color: getPriorityColor(task.priority) }}
                                    >
                                      Priority: {task.priority}
                                    </Typography>
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
