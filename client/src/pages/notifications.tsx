import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import { onAuthStateChanged } from "../firebase/auth";
import { getIdToken } from "../firebase/authUtils";

interface Notification {
  id: string;
  message: string;
  timestamp: string; // ISO string from backend or client
}

const SafeTimestamp: React.FC<{
  isoString?: string | null;
  fallback?: React.ReactNode;
  options?: Intl.DateTimeFormatOptions;
}> = ({ isoString, fallback = "Invalid Date", options }) => {
  if (!isoString) return <>{fallback}</>;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return <>{fallback}</>;
  }

  return <>{date.toLocaleTimeString(undefined, options)}</>;
};

const Notifications: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const API_BASE = "http://localhost:3000";

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Optional: initial fetch of notifications if backend supports it
  useEffect(() => {
    if (!user || !projectId) return;

    setLoading(true);
    setError(null);

    getIdToken()
      .then((token) =>
        fetch(`${API_BASE}/projects/${projectId}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications");
        return res.json();
      })
      .then((data: Notification[]) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [user, projectId]);

  // Socket.IO listeners
  useEffect(() => {
    if (!projectId || !user) return;

    socket.connect();
    socket.emit("joinProject", projectId);

    // Helper to add new notification
    const addNotification = (message: string) => {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          message,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    const onTaskCreated = ({ task }: { task: { title: string } }) => {
      addNotification(`Task created: ${task.title}`);
    };
    const onTaskUpdated = ({ task }: { task: { title: string } }) => {
      addNotification(`Task updated: ${task.title}`);
    };
    const onTaskDeleted = ({ taskId }: { taskId: string }) => {
      addNotification(`Task deleted: ${taskId}`);
    };

    socket.on("taskCreated", onTaskCreated);
    socket.on("taskUpdated", onTaskUpdated);
    socket.on("taskDeleted", onTaskDeleted);

    return () => {
      socket.off("taskCreated", onTaskCreated);
      socket.off("taskUpdated", onTaskUpdated);
      socket.off("taskDeleted", onTaskDeleted);

      // Only emit leaveProject if backend handles it
      // socket.emit("leaveProject", projectId);

      socket.disconnect();
    };
  }, [projectId, user]);

  if (!projectId) return <p>Project ID not found.</p>;
  if (!user) return <p>Please log in to view notifications.</p>;
  if (loading) return <p>Loading notifications...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div
      style={{
        maxHeight: 300,
        overflowY: "auto",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: 4,
      }}
    >
      <h3>Task Notifications for Project {projectId}</h3>
      {notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {notifications.map(({ id, message, timestamp }) => (
            <li
              key={id}
              style={{
                marginBottom: "0.5rem",
                borderBottom: "1px solid #eee",
                paddingBottom: "0.5rem",
              }}
            >
              <strong>{message}</strong>
              <br />
              <small style={{ color: "#666" }}>
                <SafeTimestamp isoString={timestamp} />
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
