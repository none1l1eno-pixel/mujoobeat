from django.conf import settings
from django.db import models


class Announcement(models.Model):
    """운영자 공지. 작성은 Django admin(스태프 전용)에서만, 조회는 REST로 전체 유저에게."""
    title = models.CharField(max_length=200)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Suggestion(models.Model):
    """유저 건의사항. 제출은 REST로, 확인은 Django admin에서."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='suggestions')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} @ {self.created_at:%Y-%m-%d}'


class ChatMessage(models.Model):
    """방 구분 없는 전역 채팅 — 로그인한 모든 유저가 같은 채널을 공유한다."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    message = models.CharField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.user}: {self.message[:30]}'
