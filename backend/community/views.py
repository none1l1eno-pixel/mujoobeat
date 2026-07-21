from rest_framework import generics

from .models import Announcement, ChatMessage
from .serializers import AnnouncementSerializer, ChatMessageSerializer, SuggestionSerializer


class AnnouncementListView(generics.ListAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer


class SuggestionCreateView(generics.CreateAPIView):
    serializer_class = SuggestionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatHistoryView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        # 최근 50개를 오래된순으로 (채팅창에 그대로 이어붙일 수 있게)
        recent = list(ChatMessage.objects.select_related('user').order_by('-created_at')[:50])
        return list(reversed(recent))
