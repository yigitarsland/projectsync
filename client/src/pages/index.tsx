import * as React from 'react'; 
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

const projects = [
  { id: 1, name: 'Project Alpha' },
  { id: 2, name: 'Project Beta' },
  { id: 3, name: 'Project Gamma' },
];

export default function DashboardPage() {
  const handleProjectSelect = (project: { id?: number; name: any; }) => {
    alert(`You selected: ${project.name}`);
    // You can replace alert with navigation or other logic here
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Select a Project
      </Typography>
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
