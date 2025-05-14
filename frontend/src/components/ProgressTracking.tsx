import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import axios from 'axios';
import { Task } from '../types';
import { User } from 'firebase/auth';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProgressTrackingProps {
  user: User;
}

const ProgressTracking: React.FC<ProgressTrackingProps> = ({ user }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = await user.getIdToken();
        const response = await axios.get<Task[]>(`http://localhost:5000/api/tasks/project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(response.data);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };
    fetchTasks();
  }, [projectId, user]);

  const taskStatusCounts = {
    'To Do': tasks.filter((task) => task.status === 'To Do').length,
    'In Progress': tasks.filter((task) => task.status === 'In Progress').length,
    'Done': tasks.filter((task) => task.status === 'Done').length,
  };

  const data = {
    labels: ['To Do', 'In Progress', 'Done'],
    datasets: [
      {
        label: 'Task Status',
        data: [taskStatusCounts['To Do'], taskStatusCounts['In Progress'], taskStatusCounts['Done']],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Task Status' },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">Progress Tracking</h1>
      <div className="bg-white p-4 rounded shadow-md max-w-md mx-auto">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
};

export default ProgressTracking;