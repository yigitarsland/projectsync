import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  TextField,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";

type Task = {
  id: string;
  title: string;
  description: string;
  date: string; // due date as YYYY-MM-DD string
  isEditing: boolean;
};

type Column = {
  id: string;
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

const KanbanBoard: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const generateId = () => Math.random().toString(36).slice(2, 9);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const srcIdx = columns.findIndex((c) => c.id === source.droppableId);
    const dstIdx = columns.findIndex((c) => c.id === destination.droppableId);
    if (srcIdx === -1 || dstIdx === -1) return;

    const srcCol = columns[srcIdx];
    const dstCol = columns[dstIdx];
    const srcTasks = Array.from(srcCol.tasks);
    const [moved] = srcTasks.splice(source.index, 1);

    if (srcIdx === dstIdx) {
      srcTasks.splice(destination.index, 0, moved);
      const newCols = [...columns];
      newCols[srcIdx] = { ...srcCol, tasks: srcTasks };
      setColumns(newCols);
    } else {
      const dstTasks = Array.from(dstCol.tasks);
      dstTasks.splice(destination.index, 0, moved);
      const newCols = [...columns];
      newCols[srcIdx] = { ...srcCol, tasks: srcTasks };
      newCols[dstIdx] = { ...dstCol, tasks: dstTasks };
      setColumns(newCols);
    }
  };

  const onAddNewClick = (columnId: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId ? { ...col, isAddingNew: true } : col
      )
    );
  };

  const onSaveNewTask = (
    columnId: string,
    title: string,
    description: string,
    date: string
  ) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: generateId(),
      title,
      description,
      date,
      isEditing: false,
    };
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId
          ? { ...col, tasks: [newTask, ...col.tasks], isAddingNew: false }
          : col
      )
    );
  };

  const onCancelNewTask = (columnId: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId ? { ...col, isAddingNew: false } : col
      )
    );
  };

  const onDeleteTask = (columnId: string, taskId: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId
          ? {
              ...col,
              tasks: col.tasks.filter((t) => t.id !== taskId),
            }
          : col
      )
    );
  };

  const onStartEditing = (columnId: string, taskId: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId
          ? {
              ...col,
              tasks: col.tasks.map((t) =>
                t.id === taskId ? { ...t, isEditing: true } : t
              ),
            }
          : col
      )
    );
  };

  const onSaveEditTask = (
    columnId: string,
    taskId: string,
    newTitle: string,
    newDesc: string,
    newDate: string
  ) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId
          ? {
              ...col,
              tasks: col.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      title: newTitle,
                      description: newDesc,
                      date: newDate,
                      isEditing: false,
                    }
                  : t
              ),
            }
          : col
      )
    );
  };

  const onCancelEditTask = (columnId: string, taskId: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.id === columnId
          ? {
              ...col,
              tasks: col.tasks.map((t) =>
                t.id === taskId ? { ...t, isEditing: false } : t
              ),
            }
          : col
      )
    );
  };

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
          {/* Due Date input */}
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
            <Button
              onClick={() => onCancelNewTask(columnId)}
              sx={{ mr: 1 }}
              size="small"
            >
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
      {/* Search bar */}
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

      <DragDropContext onDragEnd={onDragEnd}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            p: 2,
            height: "100vh",
            width: "20vw",
            marginRight: "auto",
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
                height: "100%",
                borderRadius: 1,
              }}
              onMouseEnter={() => setHoveredColumn(col.id)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {/* Header with count */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  userSelect: "none",
                }}
              >
                {col.title} ({col.tasks.length})
                {hoveredColumn === col.id && (
                  <IconButton
                    size="small"
                    sx={{ ml: "auto" }}
                    onClick={() => onAddNewClick(col.id)}
                    aria-label={`Add new task to ${col.title}`}
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
                      minHeight: 100,
                    }}
                  >
                    {filterTasks(col.tasks, searchTerm).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided2) => {
                          // Use React.useState inside Draggable render to track edit inputs
                          const [editTitle, setEditTitle] = React.useState(task.title);
                          const [editDesc, setEditDesc] = React.useState(task.description);
                          const [editDate, setEditDate] = React.useState(task.date);

                          return (
                            <Box
                              ref={provided2.innerRef}
                              {...provided2.draggableProps}
                              {...provided2.dragHandleProps}
                              sx={{ position: "relative" }}
                              onMouseEnter={() => setHoveredTaskId(task.id)}
                              onMouseLeave={() => setHoveredTaskId(null)}
                              onDoubleClick={() => onStartEditing(col.id, task.id)}
                            >
                              {/* Delete button on hover */}
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
                                  aria-label="Delete task"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}

                              {task.isEditing ? (
                                // Inline edit mode with due date input
                                <Card variant="outlined">
                                  <CardContent>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      margin="dense"
                                      label="Title"
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      autoFocus
                                    />
                                    <TextField
                                      fullWidth
                                      size="small"
                                      margin="dense"
                                      label="Description"
                                      multiline
                                      minRows={2}
                                      value={editDesc}
                                      onChange={(e) => setEditDesc(e.target.value)}
                                    />
                                    <TextField
                                      label="Due Date"
                                      type="date"
                                      value={editDate}
                                      onChange={(e) => setEditDate(e.target.value)}
                                      size="small"
                                      margin="dense"
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                    />
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        mt: 1,
                                      }}
                                    >
                                      <Button
                                        size="small"
                                        sx={{ mr: 1 }}
                                        onClick={() => onCancelEditTask(col.id, task.id)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() =>
                                          onSaveEditTask(
                                            col.id,
                                            task.id,
                                            editTitle,
                                            editDesc,
                                            editDate
                                          )
                                        }
                                        disabled={!editTitle.trim()}
                                      >
                                        Save
                                      </Button>
                                    </Box>
                                  </CardContent>
                                </Card>
                              ) : (
                                // Normal view with due date at bottom
                                <Card
                                  sx={{
                                    p: 1,
                                    cursor: "pointer",
                                    borderRadius: 1,
                                    backgroundColor:
                                      hoveredTaskId === task.id
                                        ? "rgba(0,0,0,0.1)"
                                        : "background.paper",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      fontWeight: "bold",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </Box>
                                  <Box
                                    sx={{
                                      fontSize: "0.85rem",
                                      color: "text.secondary",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={task.description}
                                  >
                                    {task.description}
                                  </Box>
                                  {task.date && (
                                    <Box
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: "text.secondary",
                                        mt: 0.5,
                                        fontStyle: "italic",
                                      }}
                                    >
                                      Due: {task.date}
                                    </Box>
                                  )}
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
};

export default KanbanBoard;
