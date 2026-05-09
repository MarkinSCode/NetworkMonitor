const getApiUrl = () => {
  // Production
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000/api/v1';
  }
  
  // Fallback: use current host
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.host}/api/v1`;
};

export const config = {
  apiUrl: getApiUrl(),
  appTitle: process.env.REACT_APP_TITLE || 'Network Monitor',
  refreshInterval: 30000,
};
