import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NavigateToLastProjectNotifications: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // however you save the “last project” in TasksPage
    const lastProjectId = localStorage.getItem('lastProjectId');

    if (lastProjectId) {
      navigate(`/projects/${lastProjectId}/notifications`, { replace: true });
    } else {
      // fallback: send them to dashboard or show a message
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default NavigateToLastProjectNotifications;
