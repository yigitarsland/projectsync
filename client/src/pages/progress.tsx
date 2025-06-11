import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, CircularProgress } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { onAuthStateChanged } from "../firebase/auth";  // adjust path to your auth.ts
import { getIdToken } from "../firebase/authUtils";      // adjust path to your authUtils.ts

type TaskStatus = "todo" | "in-progress" | "done";

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  assignees: { id: string; name: string }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function Progress() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);  // Firebase user or null

  const API_BASE = "http://localhost:3000";

  // Map API task object to Task interface
  const mapTask = (t: any): Task => ({
    id: t._id,
    title: t.title,
    description: t.description || "",
    date: t.dueDate ? t.dueDate.slice(0, 10) : "",
    status: t.status,
    priority: t.priority || "medium",
    assignees: (t.assignees || []).map((u: any) => ({ id: u._id, name: u.name })),
  });

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch tasks once we have a logged-in user and a projectId
  useEffect(() => {
    if (!user || !projectId) return;

    setLoading(true);
    setError(null);

    getIdToken()
      .then((token) =>
        fetch(`${API_BASE}/projects/${projectId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks");
        return res.json();
      })
      .then((data) => {
        setTasks(data.map(mapTask));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [user, projectId]);

  if (!projectId) return <Typography>No project selected.</Typography>;

  if (!user)
    return (
      <Typography>
        Please log in to view your project progress.
      </Typography>
    );

  if (loading) return <CircularProgress />;

  if (error)
    return (
      <Typography color="error">
        Error: {error}
      </Typography>
    );

  // Count tasks by status for pie chart
  const statusCounts = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  return (
    <div style={{ width: "80%", height: 600 }}>
    <Typography variant="h6" gutterBottom>
      Task Status Distribution
    </Typography>
    {pieData.length === 0 ? (
      <Typography>No tasks found.</Typography>
    ) : (
      <ResponsiveContainer>
        <PieChart>
          <Pie
            dataKey="value"
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={250}  // increased radius here
            label={(entry) => `${entry.name} (${entry.value})`}
          >
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>

  );
}
