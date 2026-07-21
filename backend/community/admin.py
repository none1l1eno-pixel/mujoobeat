from django.contrib import admin

from .models import Announcement, ChatMessage, Suggestion


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'created_at')
    search_fields = ('title', 'body')


@admin.register(Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at')
    readonly_fields = ('user', 'message', 'created_at')
    search_fields = ('user__email', 'message')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'message', 'created_at')
    readonly_fields = ('user', 'message', 'created_at')
    search_fields = ('user__email', 'message')
