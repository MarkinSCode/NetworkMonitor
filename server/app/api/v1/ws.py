import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ws_manager import ws_manager
from app.services.metrics_service import MetricsService
from app.config import settings
from app.database import SessionLocal
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()

def get_interval_from_db(agent_name: str) -> int:
    db = SessionLocal()
    try:
        metrics_service = MetricsService(db)
        return metrics_service.get_monitor_interval()
    except Exception as e:
        logger.error(f"Ошибка получения интервала: {e}")
        return 60
    finally:
        db.close()
    
def save_interval_to_db(agent_name: str, interval: int):
    db = SessionLocal()
    try:
        metrics_service = MetricsService(db)
        metrics_service.save_agent_interval(agent_name, interval)
    except Exception as e:
        logger.error(f"Ошибка сохранения интервала: {e}")
    finally:
        db.close()

async def save_metrics_to_db(agent_name: str, data: dict):
    db = SessionLocal()
    try:
        metrics_service = MetricsService(db)
        metrics_service.process_raw_metrics(agent_name, data)
    except Exception as e:
        logger.error(f"Ошибка сохранения метрик: {e}")
    finally:
        db.close()

@router.websocket("/ws/agent/{agent_name}")
async def agent_websocket(websocket: WebSocket, agent_name: str):
    await websocket.accept()
    logger.info(f"Агент {agent_name} подключился по WebSocket")
    
    await ws_manager.register(agent_name, websocket)
    
    try:
        try:
            auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        except asyncio.TimeoutError:
            logger.warning(f"Таймаут аутентификации агента {agent_name}")
            return
        
        if auth_data.get('type') != 'auth' or auth_data.get('agent_secret') != settings.AGENT_SECRET:
            await websocket.send_json({'type': 'error', 'message': 'Неверный ключ'})
            return
        
        logger.info(f"Агент {agent_name} аутентифицирован")
        await websocket.send_json({'type': 'auth_ok', 'message': 'OK'})
        
        saved_interval = get_interval_from_db(agent_name)
        ws_manager.set_interval(agent_name, saved_interval)
        
        await websocket.send_json({
            'type': 'set_interval',
            'interval': saved_interval
        })
        logger.info(f"Отправлен интервал агенту {agent_name}: {saved_interval} сек")
        
        try:
            static_msg = await asyncio.wait_for(websocket.receive_json(), timeout=30)
            if static_msg.get('type') == 'static_data':
                await save_metrics_to_db(agent_name, static_msg)
                logger.info(f"Статические данные от {agent_name} сохранены")
        except asyncio.TimeoutError:
            logger.warning(f"Таймаут статических данных от {agent_name}")
        
        last_collect_time = 0
        
        while True:
            try:
                current_time = asyncio.get_event_loop().time()
                interval = ws_manager.get_interval(agent_name)
                
                if current_time - last_collect_time >= interval:
                    await websocket.send_json({'type': 'collect'})
                    
                    try:
                        response = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                        
                        if response.get('type') == 'metrics':
                            await save_metrics_to_db(agent_name, response)
                            last_collect_time = current_time
                            
                            new_interval = get_interval_from_db(agent_name)
                            if new_interval != interval:
                                ws_manager.set_interval(agent_name, new_interval)
                                await websocket.send_json({
                                    'type': 'set_interval',
                                    'interval': new_interval
                                })
                                logger.info(f"Интервал агента {agent_name} обновлён: {new_interval} сек")
                                
                    except asyncio.TimeoutError:
                        logger.warning(f"Таймаут ответа от агента {agent_name}")
                        try:
                            await websocket.send_json({'type': 'ping'})
                        except:
                            break
                
                await asyncio.sleep(0.1)
                
            except WebSocketDisconnect:
                logger.info(f"Агент {agent_name} отключился")
                break
            except Exception as e:
                logger.error(f"Ошибка в цикле сбора: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
    finally:
        await ws_manager.unregister(agent_name)