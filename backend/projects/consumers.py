"""
실시간 동시편집 채널. plan.md Phase 3.5 — 프론트 useArrangement의 액션
(add_track/update_track/delete_track/duplicate_track/move_track/split_track/
quantize_apply/quantize_revert)을 그대로 op로 받아 같은 프로젝트 방의 다른
클라이언트에게 즉시 릴레이한다. 서버는 op의 음악적 의미를 해석하지 않는
"똑똑한 릴레이"이고, 영속화는 클라이언트가 보내는 주기적 snapshot으로 한다
(디바운스는 프론트 책임).
"""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from accounts.serializers import UserSerializer
from .models import Project


class ProjectConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.group_name = f'project_{self.project_id}'
        user = self.scope['user']

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        allowed = await self._user_can_edit(user)
        if not allowed:
            await self.close(code=4403)
            return

        self.user_data = UserSerializer(user).data
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast',
            'payload': {'type': 'presence', 'event': 'join', 'user': self.user_data},
        })

    async def disconnect(self, close_code):
        if getattr(self, 'group_name', None):
            await self.channel_layer.group_send(self.group_name, {
                'type': 'broadcast',
                'payload': {'type': 'presence', 'event': 'leave', 'user': getattr(self, 'user_data', None)},
            })
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            message = json.loads(text_data)
        except (TypeError, ValueError):
            return

        msg_type = message.get('type')

        if msg_type == 'op':
            await self.channel_layer.group_send(self.group_name, {
                'type': 'broadcast',
                'payload': {
                    'type': 'op',
                    'op': message.get('op'),
                    'client_id': message.get('client_id'),
                    'user': self.user_data,
                },
            })
        elif msg_type == 'snapshot':
            tracks = message.get('tracks', [])
            await self._save_snapshot(tracks)
        elif msg_type == 'cursor':
            # 다른 유저의 재생헤드/선택 트랙 위치 등 가벼운 프레즌스 정보(선택 구현)
            await self.channel_layer.group_send(self.group_name, {
                'type': 'broadcast',
                'payload': {'type': 'cursor', 'data': message.get('data'), 'client_id': message.get('client_id'), 'user': self.user_data},
            })

    async def broadcast(self, event):
        await self.send_json(event['payload'])

    @database_sync_to_async
    def _user_can_edit(self, user):
        try:
            project = Project.objects.get(id=self.project_id)
        except Project.DoesNotExist:
            return False
        return project.owner_id == user.id or project.collaborators.filter(user_id=user.id).exists()

    @database_sync_to_async
    def _save_snapshot(self, tracks):
        Project.objects.filter(id=self.project_id).update(data={'tracks': tracks})
