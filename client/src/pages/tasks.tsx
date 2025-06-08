// src/pages/tasks.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  TextField,
  InputAdornment,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { getIdToken } from "../firebase/authUtils";

type Task = {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  status: "todo" | "inprogress" | "inreview" | "done";
  isEditing: boolean;
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
  if (!projectId) {
    return <Typography>No project selected.</Typography>;
  }

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
  });

  // Load tasks
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
    date: string
  ) => {
    const token = await getIdToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, dueDate: date }),
    });
    if (!res.ok) throw new Error("Create failed");
    return mapTask(await res.json());
  };

  const updateTaskAPI = async (
    taskId: string,
    updates: Partial<Pick<Task, "title" | "description" | "date" | "status">>
  ) => {
    const token = await getIdToken();
    const body: any = {};
    if (updates.title)       body.title = updates.title;
    if (updates.description) body.description = updates.description;
    if (updates.date)        body.dueDate = updates.date;
    if (updates.status)      body.status = updates.status;
    const res = await fetch(
      `${API_BASE}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error("Update failed");
    return mapTask(await res.json());
  };

  const deleteTaskAPI = async (taskId: string) => {
    const token = await getIdToken();
    const res = await fetch(
      `${API_BASE}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error("Delete failed");
  };

  // Handlers

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    const srcCol = columns.find((c) => c.id === source.droppableId)!;
    const dstCol = columns.find((c) => c.id === destination.droppableId)!;
    const srcTasks = [...srcCol.tasks];
    const [moved] = srcTasks.splice(source.index, 1);

    if (srcCol.id === dstCol.id) {
      srcTasks.splice(destination.index, 0, moved);
      setColumns((cols) =>
        cols.map((c) =>
          c.id === srcCol.id ? { ...c, tasks: srcTasks } : c
        )
      );
    } else {
      try {
        const updated = await updateTaskAPI(moved.id, { status: dstCol.id });
        const dstTasks = [...dstCol.tasks];
        dstTasks.splice(destination.index, 0, updated);
        setColumns((cols) =>
          cols.map((c) => {
            if (c.id === srcCol.id) return { ...c, tasks: srcTasks };
            if (c.id === dstCol.id) return { ...c, tasks: dstTasks };
            return c;
          })
        );
      } catch {
        alert("Failed to move task");
      }
    }
  };

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
    date: string
  ) => {
    if (!title.trim()) return;
    try {
      const newTask = await createTaskAPI(columnId as any, title, description, date);
      setColumns((cols) =>
        cols.map((c) =>
          c.id === columnId
            ? { ...c, tasks: [newTask, ...c.tasks], isAddingNew: false }
            : c
        )
      );
    } catch {
      alert("Error creating task");
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
    } catch {
      alert("Error deleting task");
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
    newDate: string
  ) => {
    try {
      const updated = await updateTaskAPI(taskId, {
        title: newTitle,
        description: newDesc,
        date: newDate,
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
    } catch {
      alert("Error updating task");
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

  const NewTaskInput: React.FC<{ columnId: string }> = ({ columnId }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");

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
            size="small"
            margin="dense"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button onClick={() => onCancelNewTask(columnId)} sx={{ mr: 1 }} size="small">
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => onSaveNewTask(columnId, title, description, date)}
              disabled={!title.trim()}
            >
              Add
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const filterTasks = (tasks: Task[], term: string) => {
    if (!term.trim()) return tasks;
    const lt = term.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(lt) ||
        t.description.toLowerCase().includes(lt)
    );
  };

  return (
    <>
      <Box sx={{ p: 2, width: "20vw", marginRight: "auto" }}>
        <TextField
          label="Search tasks"
          variant="outlined"
          fullWidth
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* DragDropContext must wrap all Droppables/Draggables as children */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            p: 2,
            height: "100vh",
            width: "100%",
          }}
        >
          {columns.map((col) => (
            <Box
              key={col.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                flex: "1 1 0",
                maxWidth: 320,
                minWidth: 280,
                borderRadius: 1,
              }}
              onMouseEnter={() => setHoveredColumn(col.id)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                }}
              >
                {col.title} ({col.tasks.length})
                {hoveredColumn === col.id && (
                  <IconButton
                    size="small"
                    sx={{ ml: "auto" }}
                    onClick={() => onAddNewClick(col.id)}
                  >
                    <AddIcon />
                  </IconButton>
                )}
              </Box>

              {col.isAddingNew && <NewTaskInput columnId={col.id} />}

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      flexGrow: 1,
                      overflowY: "auto",
                      px: 1,
                      py: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    {filterTasks(col.tasks, searchTerm).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(prov) => (
                          <Box
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            sx={{ position: "relative" }}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onMouseLeave={() => setHoveredTaskId(null)}
                            onDoubleClick={() => onStartEditing(col.id, task.id)}
                          >
                            {hoveredTaskId === task.id && !task.isEditing && (
                              <IconButton
                                size="small"
                                sx={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  zIndex: 10,
                                }}
                                onClick={() => onDeleteTask(col.id, task.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}

                            {task.isEditing ? (
                              <Card variant="outlined">
                                <CardContent>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    margin="dense"
                                    label="Title"
                                    value={task.title}
                                    onChange={(e) =>
                                      onSaveEditTask(col.id, task.id, e.target.value, task.description, task.date)
                                    }
                                  />
                                  {/* ... other edit inputs ... */}
                                </CardContent>
                              </Card>
                            ) : (
                              <Card sx={{ p: 1, cursor: "pointer" }}>
                                <Typography fontWeight="bold">{task.title}</Typography>
                                <Typography variant="body2" noWrap>
                                  {task.description}
                                </Typography>
                                {task.date && <Typography variant="caption">Due: {task.date}</Typography>}
                              </Card>
                            )}
                          </Box>
                        )}
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
