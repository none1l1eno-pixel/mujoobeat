from django.urls import path

from .views import AnnouncementListView, ChatHistoryView, SuggestionCreateView

urlpatterns = [
    path('announcements/', AnnouncementListView.as_view(), name='announcement-list'),
    path('suggestions/', SuggestionCreateView.as_view(), name='suggestion-create'),
    path('chat/history/', ChatHistoryView.as_view(), name='chat-history'),
]
