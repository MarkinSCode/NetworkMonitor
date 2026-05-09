export const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  appTitle: process.env.REACT_APP_TITLE || 'Network Monitor',
  refreshInterval: 30000,
  serverIp: '192.168.31.30',
  serverPort: '8000',
  frontendPort: '3000',
  pgadminPort: '5050',
};
