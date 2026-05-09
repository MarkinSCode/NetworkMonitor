import socket
import os

hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)

server_port = os.getenv('SERVER_PORT', '8000')
frontend_port = os.getenv('FRONTEND_PORT', '3000')
pgadmin_port = os.getenv('PGADMIN_PORT', '5050')

config_content = f"""export const config = {{
  apiUrl: process.env.REACT_APP_API_URL || 'http://{local_ip}:{server_port}/api/v1',
  appTitle: process.env.REACT_APP_TITLE || 'Network Monitor',
  refreshInterval: 30000,
  serverIp: '{local_ip}',
  serverPort: '{server_port}',
  frontendPort: '{frontend_port}',
  pgadminPort: '{pgadmin_port}',
}};
"""

with open('src/config.ts', 'w') as f:
    f.write(config_content)