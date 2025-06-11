import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getIdToken } from "../firebase/authUtils";

type Task = {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status?: "todo" | "inprogress" | "inreview" | "done";
  isEditing?: boolean;
  priority?: "low" | "medium" | "high";
  assignees?: User[]; 
};

type User = {
  id: string;
  name: string;
  avatarUrl?: string;
};

const API_BASE = "http://localhost:3000";

const GanttChartPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchTasks = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch tasks");

        const data = await res.json();
        setTasks(
          data.map((t: any) => ({
            id: t._id,
            title: t.title,
            startDate: t.startDate || t.dueDate || "",
            endDate: t.endDate || t.dueDate || "",
            description: t.description,
            status: t.status,
            priority: t.priority,
            assignees: t.assignees,
          }))
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId]);

  if (!projectId) return <p>No project selected.</p>;
  if (loading) return <p>Loading Gantt chart data...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Gantt Chart for Project {projectId}</h1>
      {/* TODO: Render your Gantt chart here using the `tasks` state */}
      <pre>{JSON.stringify(tasks, null, 2)}</pre>
    </div>
  );
};

export default GanttChartPage;
