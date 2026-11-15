import React from 'react';
import { useNavigate } from 'react-router-dom';
import Landing from '../components/LandingPage';

/**
 * Route wrapper: renders the 3D Landing page.
 * On "Enter Command Center", navigates to the dashboard overview.
 */
const LandingRoute: React.FC = () => {
  const navigate = useNavigate();
  return <Landing onEnter={() => navigate('/')} />;
};

export default LandingRoute;
