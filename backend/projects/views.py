from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .ai_comment import generate_comment
from .models import Project, ProjectCollaborator
from .permissions import IsOwnerOrCollaboratorOrPublicReadOnly
from .serializers import ProjectCollaboratorSerializer, ProjectListSerializer, ProjectSerializer

User = get_user_model()


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrCollaboratorOrPublicReadOnly]

    def get_serializer_class(self):
        return ProjectListSerializer if self.action == 'list' else ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(
            Q(owner=user) | Q(collaborators__user=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, permission_classes=[permissions.IsAuthenticated])
    def public(self, request):
        qs = Project.objects.filter(is_public=True)
        serializer = ProjectListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, url_path='admin-all', permission_classes=[permissions.IsAdminUser])
    def admin_all(self, request):
        qs = Project.objects.all()
        serializer = ProjectListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='collaborators')
    def add_collaborator(self, request, pk=None):
        project = self.get_object()
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': '해당 이메일의 사용자를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        if user.id == project.owner_id:
            return Response({'detail': '이미 소유자입니다.'}, status=status.HTTP_400_BAD_REQUEST)
        collab, created = ProjectCollaborator.objects.get_or_create(project=project, user=user)
        return Response(
            ProjectCollaboratorSerializer(collab).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['delete'], url_path=r'collaborators/(?P<user_id>\d+)')
    def remove_collaborator(self, request, pk=None, user_id=None):
        project = self.get_object()
        ProjectCollaborator.objects.filter(project=project, user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        project = self.get_object()
        try:
            text = generate_comment(project)
        except RuntimeError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'comment': text})
