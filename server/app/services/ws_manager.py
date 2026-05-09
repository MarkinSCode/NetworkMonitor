import logging
from typing import Dict
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:    
    def __init__(self):
        self.agents: Dict[str, dict] = {}
    
    async def register(self, agent_name: str, websocket: WebSocket):
        self.agents[agent_name] = {
            'websocket': websocket,
            'interval': 60,
            'connected_at': datetime.utcnow()
        }
        logger.info(f"Агент {agent_name} зарегистрирован. Всего: {len(self.agents)}")
    
    async def unregister(self, agent_name: str):
        if agent_name in self.agents:
            del self.agents[agent_name]
            logger.info(f"Агент {agent_name} удалён. Осталось: {len(self.agents)}")
    
    def set_interval(self, agent_name: str, interval: int):
        if agent_name in self.agents:
            self.agents[agent_name]['interval'] = interval
    
    def get_interval(self, agent_name: str) -> int:
        if agent_name in self.agents:
            return self.agents[agent_name]['interval']
        return 60

    async def update_interval(self, agent_name: str, interval: int):
        if agent_name in self.agents:
            self.agents[agent_name]['interval'] = interval
            try:
                await self.agents[agent_name]['websocket'].send_json({
                    'type': 'set_interval',
                    'interval': interval
                })
                logger.info(f"Интервал агента {agent_name} изменён на {interval} сек")
            except Exception as e:
                logger.error(f"Ошибка отправки интервала: {e}")

ws_manager = WebSocketManager()