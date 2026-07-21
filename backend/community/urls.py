from django.urls import path

from .views import AnnouncementListView, ChatHistoryView, ChatMessageDeleteView, SuggestionCreateView

urlpatterns = [
    path('announcements/', AnnouncementListView.as_view(), name='announcement-list'),
    path('suggestions/', SuggestionCreateView.as_view(), name='suggestion-list-create'),
    path('chat/history/', ChatHistoryView.as_view(), name='chat-history'),
    path('chat/<int:pk>/', ChatMessageDeleteView.as_view(), name='chat-delete'),
]
