import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';
import { Task, User as UserType } from '../types';
import { User } from 'firebase/auth';

const socket: Socket = io('http://localhost:5000');

interface KanbanBoardProps {
  user: User;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ user }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<{
    'To Do': Task[];
    'In Progress': Task[];
    'Done': Task[];
  }>({
    'To Do': [],
    'In Progress': [],
    'Done': [],
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = await user.getIdToken();
        const response = await axios.get<Task[]>(`http://localhost:5000/api/tasks/project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedTasks = response.data.map((task) => ({ ...task, showSubtasks: false }));
        setTasks(fetchedTasks);
        setColumns({
          'To Do': fetchedTasks.filter((task) => task.status === 'To Do'),
          'In Progress': fetchedTasks.filter((task) => task.status === 'In Progress'),
          'Done': fetchedTasks.filter((task) => task.status === 'Done'),
        });
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };
    fetchTasks();

    socket.on('taskUpdated', (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((task) =>
          task._id.toString() === updatedTask._id.toString()
            ? { ...updatedTask, showSubtasks: task.showSubtasks }
            : task
        )
      );
      setColumns({
        'To Do': tasks.filter((task) => task.status === 'To Do'),
        'In Progress': tasks.filter((task) => task.status === 'In Progress'),
        'Done': tasks.filter((task) => task.status === 'Done'),
      });
    });

    return () => {
      socket.off('taskUpdated');
    };
  }, [projectId, user, tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColumn = [...columns[source.droppableId as keyof typeof columns]];
    const destColumn = [...columns[destination.droppableId as keyof typeof columns]];
    const [movedTask] = sourceColumn.splice(source.index, 1);
    movedTask.status = destination.droppableId as 'To Do' | 'In Progress' | 'Done';
    destColumn.splice(destination.index, 0, movedTask);

    setColumns({
      ...columns,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn,
    });

    try {
      const token = await user.getIdToken();
      await axios.put(
        `http://localhost:5000/api/tasks/${movedTask._id}`,
        { status: movedTask.status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket.emit('taskUpdate', movedTask);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const toggleSubtasks = (taskId: ObjectId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task._id.toString() === taskId.toString()
          ? { ...task, showSubtasks: !task.showSubtasks }
          : task
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">Kanban Board</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col md:flex-row md:space-x-4">
          {Object.keys(columns).map((columnId) => (
            <Droppable droppableId={columnId} key={columnId}>
              {(provided) => (
                <div
                  className="bg-white p-4 rounded shadow-md w-full md:w-1/3 mb-4 md:mb-0"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  <h2 className="text-lg font-semibold mb-2">{columnId}</h2>
                  {columns[columnId as keyof typeof columns].map((task, index) => (
                    <Draggable key={task._id.toString()} draggableId={task._id.toString()} index={index}>
                      {(provided) => (
                        <div
                          className="bg-gray-50 p-2 mb-2 rounded border"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <div className="flex justify-between items-center">
                            <span>{task.title}</span>
                            {task.subtasks?.length > 0 && (
                              <button
                                onClick={() => toggleSubtasks(task._id)}
                                className="text-blue-500 hover:underline text-sm"
                              >
                                {task.showSubtasks ? 'Hide' : 'Show'}
                              </button>
                            )}
                          </div>
                          {task.showSubtasks && task.subtasks?.length > 0 && (
                            <ul className="ml-4 mt-2 text-sm text-gray-600">
                              {task.subtasks.map((subtask) => (
                                <li key={subtask._id.toString()}>{subtask.title}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;