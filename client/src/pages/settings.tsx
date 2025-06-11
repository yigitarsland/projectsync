import React, { useEffect, useState } from "react";
import { getIdToken, getCurrentUserUid } from '../firebase/authUtils';

interface User {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
  role: "owner" | "member";
}

const API_BASE = "http://localhost:3000"; 

export const Settings: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Fetch all users + current user role on mount
  useEffect(() => {
  const fetchUsers = async () => {
    try {
      const token = await getIdToken();
      const currentUid = await getCurrentUserUid();

      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: User[] = await res.json();
      setUsers(data);

      const currentUser = data.find(u => u.firebaseUid === currentUid);
      if (!currentUser) throw new Error("Current user not found");
      setCurrentUserRole(currentUser.role);

      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };
  fetchUsers();
}, []);


  // Handle change of user fields (role, name, email)
  const handleChange = (userId: string, field: keyof User, value: string) => {
    setUsers(prev =>
      prev.map(u => (u._id === userId ? { ...u, [field]: value } : u))
    );
  };

  // Save changes for a specific user to backend
  const handleSave = async (user: User) => {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/users/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: user.role,
          name: user.name,
          // email: user.email,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      alert(`User ${user.name} updated successfully`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error: {error}</p>;

  // Only allow owners to see/edit settings
  if (currentUserRole !== "owner")
    return <p>You do not have permission to access this page.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>User Settings</h1>
      <table border={1} cellPadding={8} cellSpacing={0}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Save</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>
                <input
                  type="text"
                  value={user.name}
                  onChange={e => handleChange(user._id, "name", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="email"
                  value={user.email}
                  disabled
                />
              </td>
              <td>
                <select
                  value={user.role}
                  onChange={e => handleChange(user._id, "role", e.target.value)}
                >
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleSave(user)}>Save</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Settings;
