import * as React from 'react';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

import { getIdToken } from '../firebase/authUtils';  // Adjust path if needed

type Project = {
  id: number;
  name: string;
};

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProjects = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) throw new Error('User is not authenticated');

      const res = await fetch('http://localhost:3000/projects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);

      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectSelect = (project: Project) => {
    alert(`You selected: ${project.name}`);
    // Replace alert with navigation or other logic
  };

  const handleCreateProject = async () => {
    const projectName = prompt('Enter new project name:');
    if (!projectName || !projectName.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) throw new Error('User is not authenticated');

      const res = await fetch('http://localhost:3000/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to create project: ${res.statusText}`);
      }

      // Optionally, get the newly created project from response
      // const newProject = await res.json();

      // Refresh the projects list
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Typography>Loading projects...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4" gutterBottom>
          Select a Project
        </Typography>
        <Button variant="contained" color="primary" onClick={handleCreateProject}>
          Create Project
        </Button>
      </Box>
      <List>
        {projects.map((project) => (
          <ListItem key={project.id} disablePadding>
            <ListItemButton onClick={() => handleProjectSelect(project)}>
              <ListItemText primary={project.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}
