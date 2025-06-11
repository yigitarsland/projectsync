import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getIdToken } from "../firebase/authUtils";

type User = {
  id: string;
  name: string;
  avatarUrl?: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status?: "todo" | "inprogress" | "inreview" | "done";
  priority?: "low" | "medium" | "high";
  assignees?: User[];
};

type Project = {
  id: string;
  name: string;
};

const API_BASE = "http://localhost:3000";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// parseDate: safely parse YYYY-MM-DD into a Date or null if invalid
const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

const GanttChartPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map backend task to Task type, aligned with TasksPage
  const mapTask = (t: any): Task => ({
    id: t._id,
    title: t.title,
    description: t.description || "",
    startDate: t.startDate ? t.startDate.slice(0, 10) : (t.dueDate ? t.dueDate.slice(0, 10) : ""),
    endDate: t.endDate ? t.endDate.slice(0, 10) : (t.dueDate ? t.dueDate.slice(0, 10) : ""),
    status: t.status || "todo",
    priority: t.priority || "medium",
    assignees: (t.assignees || []).map((u: any) => ({
      id: u._id,
      name: u.name,
      avatarUrl: u.avatarUrl,
    })),
  });

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = await getIdToken();

        // Fetch project details
        const projectRes = await fetch(`${API_BASE}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!projectRes.ok) throw new Error("Failed to fetch project");
        const projectData = await projectRes.json();
        setProject({ id: projectData._id, name: projectData.name });

        // Fetch tasks
        const tasksRes = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!tasksRes.ok) throw new Error("Failed to fetch tasks");
        const tasksData = await tasksRes.json();
        const mappedTasks = tasksData.map(mapTask);
        setTasks(mappedTasks);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData().catch(console.error);
  }, [projectId]);

  if (!projectId) return <p>No project selected.</p>;
  if (loading) return <p>Loading Gantt chart data...</p>;
  if (error) return <p>Error: {error}</p>;
  if (tasks.length === 0) return <p>No tasks found for this project.</p>;

  // Filter valid dates only
  const validStartDates = tasks
    .map((t) => parseDate(t.startDate))
    .filter((d): d is Date => d !== null);
  const validEndDates = tasks
    .map((t) => parseDate(t.endDate))
    .filter((d): d is Date => d !== null);

  if (validStartDates.length === 0 || validEndDates.length === 0) {
    return <p>No valid task dates to display the Gantt chart.</p>;
  }

  const minDate = new Date(Math.min(...validStartDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...validEndDates.map((d) => d.getTime())));

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / MS_PER_DAY) + 1;

  // Helpers to convert dates to % left offset and width
  const dateToPercent = (dateStr: string) => {
    const date = parseDate(dateStr);
    if (!date) return 0;
    const diffDays = Math.floor((date.getTime() - minDate.getTime()) / MS_PER_DAY);
    return (diffDays / totalDays) * 100;
  };

  const durationPercent = (start: string, end: string) => {
    const startD = parseDate(start);
    const endD = parseDate(end);
    if (!startD || !endD) return 0;
    const diffDays = Math.floor((endD.getTime() - startD.getTime()) / MS_PER_DAY) + 1;
    return (diffDays / totalDays) * 100;
  };

  // Color coding by status
  const statusColors: Record<string, string> = {
    todo: "#ccc",
    inprogress: "#3b82f6",
    inreview: "#f59e0b",
    done: "#10b981",
  };

  return (
    <div style={{ padding: "0vw", minWidth: 0, marginLeft: -150, marginTop: -30, maxWidth: "100vw", color: "#fff" }}>
      <h1 style={{ fontSize: "2.5vw" }}>Gantt Chart for Project {project?.name || projectId}</h1>

      <div
        style={{
          position: "relative",
          border: "1px solid #ccc",
          padding: "1.5vw",
          background: "#fafafa",
          borderRadius: 8,
          maxWidth: "70vw",
          width: "70vw",
          minWidth: "60vw",
          overflowX: "auto",
          marginLeft: "2vw",
        }}
      >
        {/* Tasks */}
        {tasks.map((task) => {
          const left = dateToPercent(task.startDate);
          const width = durationPercent(task.startDate, task.endDate);
          const bgColor = statusColors[task.status || "todo"] || "#999";

          return (
            <div key={task.id} style={{ marginBottom: "1.5vw" }}>
              <div style={{ fontWeight: "bold", marginBottom: "0.5vw", color: "#000", fontSize: "1.2vw" }}>{task.title}</div>
              <div
                style={{
                  position: "relative",
                  height: "4vw",
                  backgroundColor: "#e5e7eb",
                  borderRadius: 6,
                }}
              >
                <div
                  title={`${task.title}: ${task.startDate} → ${task.endDate}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    height: "100%",
                    backgroundColor: bgColor,
                    borderRadius: 6,
                    transition: "left 0.3s, width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Day Lines Overlay */}
        <div
          style={{
            position: "absolute",
            top: "1.5vw",
            left: "1.5vw",
            right: "1.5vw",
            bottom: "1.5vw",
            pointerEvents: "none", // Prevent interaction with lines
          }}
        >
          {(() => {
            const dayLines = [];
            let currentDate = new Date(minDate);
            while (currentDate <= maxDate) {
              const diffDays = Math.floor((currentDate.getTime() - minDate.getTime()) / MS_PER_DAY);
              const leftPercent = (diffDays / totalDays) * 100;

              dayLines.push(
                <div
                  key={currentDate.toISOString()}
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    top: 0,
                    bottom: 0,
                    width: "1px",
                    backgroundColor: "#d1d5db", // Light gray for visibility
                    opacity: 0.5,
                  }}
                />
              );

              // Move to next day
              currentDate = new Date(currentDate.getTime() + MS_PER_DAY);
            }
            return dayLines;
          })()}
        </div>

        {/* Timeline Labels */}
        <div
          style={{
            marginTop: "2vw",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "1.2vw",
            color: "#666",
            fontFamily: "monospace",
          }}
        >
          <div>{minDate.toISOString().slice(0, 10)}</div>
          <div>{maxDate.toISOString().slice(0, 10)}</div>
        </div>

        {/* Day Labels */}
        <div
          style={{
            marginTop: "0.5vw",
            position: "relative",
            height: "2vw",
          }}
        >
          {(() => {
            const dayLabels = [];
            let currentDate = new Date(minDate);
            while (currentDate <= maxDate) {
              const diffDays = Math.floor((currentDate.getTime() - minDate.getTime()) / MS_PER_DAY);
              const leftPercent = (diffDays / totalDays) * 100;

              dayLabels.push(
                <div
                  key={currentDate.toISOString()}
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    transform: "translateX(-50%)", // Center the label
                    fontSize: "0.8vw",
                    color: "#666",
                    fontFamily: "monospace",
                  }}
                >
                  {currentDate.getDate()} {/* Show day of month */}
                </div>
              );

              currentDate = new Date(currentDate.getTime() + MS_PER_DAY);
            }
            return dayLabels;
          })()}
        </div>
      </div>
    </div>
  );
};

export default GanttChartPage;