from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Project, ProjectCollaborator


class ProjectCollaboratorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProjectCollaborator
        fields = ['id', 'user', 'role', 'invited_at']


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    collaborators = ProjectCollaboratorSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'bpm', 'key_tonic', 'key_mode', 'is_public',
            'data', 'owner', 'collaborators', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'collaborators', 'created_at', 'updated_at']


class ProjectListSerializer(serializers.ModelSerializer):
    """목록에서는 무거운 data(JSONB) 필드를 뺀다."""
    owner = UserSerializer(read_only=True)
    track_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'title', 'bpm', 'is_public', 'owner', 'track_count', 'created_at', 'updated_at']

    def get_track_count(self, obj):
        return len(obj.data.get('tracks', [])) if obj.data else 0
