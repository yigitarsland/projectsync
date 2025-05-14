import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth, signOut, User as FirebaseUser } from 'firebase/auth';
import axios from 'axios';
import { Project, User } from '../types';

interface DashboardProps {
  user: FirebaseUser;
  auth: Auth;
}

const Dashboard: React.FC<DashboardProps> = ({ user, auth }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [role, setRole] = useState<'project_manager' | 'team_member'>('team_member');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await user.getIdToken();
        const [projectsRes, userRes] = await Promise.all([
          axios.get<Project[]>('http://localhost:5000/api/projects', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get<User[]>('http://localhost:5000/api/users', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setProjects(projectsRes.data);
        const currentUser = userRes.data.find((u) => u.email === user.email);
        setRole(currentUser?.role || 'team_member');
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'project_manager') {
      alert('Only project managers can create projects');
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await axios.post<Project>(
        'http://localhost:5000/api/projects',
        { name: projectName, ownerId: user.uid },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjects([...projects, response.data]);
      setProjectName('');
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">ProjectSync Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      {role === 'project_manager' && (
        <div className="bg-white p-4 rounded shadow-md mb-4">
          <h2 className="text-lg font-semibold mb-2">Create Project</h2>
          <form onSubmit={handleCreateProject}>
            <div className="mb-4">
              <label className="block text-gray-700">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Create
            </button>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <div key={project._id.toString()} className="bg-white p-4 rounded shadow-md">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <div className="mt-2 flex space-x-2">
              <Link
                to={`/project/${project._id}/kanban`}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Kanban
              </Link>
              <Link
                to={`/project/${project._id}/progress`}
                className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
              >
                Progress
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;