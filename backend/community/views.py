from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Announcement, ChatMessage, Suggestion
from .serializers import AnnouncementSerializer, ChatMessageSerializer, SuggestionSerializer


class AnnouncementListView(generics.ListCreateAPIView):
    """조회는 로그인한 누구나, 작성은 관리자만(is_staff)."""
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return super().get_permissions()


class SuggestionCreateView(generics.ListCreateAPIView):
    """제출은 로그인한 누구나, 목록 조회는 관리자만(is_staff) — 다른 사람 건의사항 보호."""
    queryset = Suggestion.objects.select_related('user').all()
    serializer_class = SuggestionSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatHistoryView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        # 최근 50개를 오래된순으로 (채팅창에 그대로 이어붙일 수 있게)
        recent = list(ChatMessage.objects.select_related('user').order_by('-created_at')[:50])
        return list(reversed(recent))


class ChatMessageDeleteView(APIView):
    """관리자가 채팅 메시지를 지우면 접속 중인 모든 유저에게도 실시간으로 반영한다."""
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk=None):
        deleted, _ = ChatMessage.objects.filter(pk=pk).delete()
        if deleted:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)('global_chat', {
                'type': 'broadcast',
                'payload': {'type': 'chat_delete', 'id': int(pk)},
            })
        return Response(status=204)
