import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';

import { getIdToken } from '../firebase/authUtils';  // Adjust path if needed

type Project = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const navigate = useNavigate();
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

      if (!res.ok) {
        throw new Error(`Failed to fetch projects: ${res.statusText}`);
      }

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

      // Navigate to the Kanban board for the selected project
  const handleProjectSelect = (project: Project) => {
    // remember this project
    localStorage.setItem('lastProjectId', project.id);
    navigate(`/projects/${project.id}/tasks`);
  };

  const handleCreateProject = async () => {
    const projectName = prompt('Enter new project name:');
    if (!projectName?.trim()) return;

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
        const { error } = await res.json();
        throw new Error(error || `Failed to create project: ${res.statusText}`);
      }

      await fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async (project: Project) => {
    const newName = prompt('Enter new project name:', project.name);
    if (!newName?.trim() || newName === project.name) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) throw new Error('User is not authenticated');

      const res = await fetch(`http://localhost:3000/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || `Failed to update project: ${res.statusText}`);
      }

      await fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getIdToken();
      if (!token) throw new Error('User is not authenticated');

      const res = await fetch(`http://localhost:3000/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || `Failed to delete project: ${res.statusText}`);
      }

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
      <Box display="flex" justifyContent="flex-end" alignItems="center" pr={1} pt={1} mb={0}>
        <Button variant="outlined" color="primary" onClick={handleCreateProject} size="large">
          Create Project
        </Button>
      </Box>

      <Box width="70%" textAlign="left" px={0} mt={-6}>
        <List>
          {projects.map((project) => (
            <ListItem
              key={project.id}
              disablePadding
              sx={{
                position: 'relative',
                '&:hover .action-button': { visibility: 'visible' },
              }}
            >
              <ListItemButton onClick={() => handleProjectSelect(project)}>
                <Typography variant="h6" fontWeight="bold" sx={{ width: '100%' }}>
                  {project.name}
                </Typography>
              </ListItemButton>

              <IconButton
                aria-label="edit"
                size="small"
                onClick={() => handleEditProject(project)}
                sx={{
                  position: 'absolute',
                  right: 40,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  visibility: 'hidden',
                }}
                className="action-button"
              >
                <EditIcon fontSize="small" />
              </IconButton>

              <IconButton
                aria-label="delete"
                size="small"
                onClick={() => handleDeleteProject(project.id)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  visibility: 'hidden',
                }}
                className="action-button"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </>
  );
}
