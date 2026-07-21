"""
전역 채팅. 프로젝트 방(projects/consumers.py)과 달리 방 구분 없이 로그인한 모든
유저가 하나의 그룹(global_chat)에 붙는다. 이력은 REST(/api/community/chat/history/)로
불러오고, 이후 새 메시지는 이 소켓으로 실시간 브로드캐스트.
"""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from accounts.serializers import UserSerializer
from .models import ChatMessage

GROUP_NAME = 'global_chat'
MAX_MESSAGE_LEN = 1000


class GlobalChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.user_data = UserSerializer(user).data
        await self.channel_layer.group_add(GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(GROUP_NAME, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            message = json.loads(text_data)
        except (TypeError, ValueError):
            return

        if message.get('type') != 'chat':
            return
        text = (message.get('message') or '').strip()[:MAX_MESSAGE_LEN]
        if not text:
            return

        chat_message = await self._save_message(text)
        await self.channel_layer.group_send(GROUP_NAME, {
            'type': 'broadcast',
            'payload': {
                'type': 'chat',
                'id': chat_message.id,
                'message': chat_message.message,
                'created_at': chat_message.created_at.isoformat(),
                'user': self.user_data,
            },
        })

    async def broadcast(self, event):
        await self.send_json(event['payload'])

    @database_sync_to_async
    def _save_message(self, text):
        return ChatMessage.objects.create(user_id=self.scope['user'].id, message=text)
