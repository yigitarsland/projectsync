import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NavigateToLastProjectTasks() {
  const navigate = useNavigate();

  useEffect(() => {
    const last = localStorage.getItem('lastProjectId');
    if (last) {
      navigate(`/projects/${last}/tasks`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return null;
}