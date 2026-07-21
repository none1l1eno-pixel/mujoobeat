from django.conf import settings
from django.db import models


class Project(models.Model):
    """
    미디 노트/트랙 데이터를 JSONB(data)에 통째로 저장(plan.md 9.2절).
    실시간 협업 중 오는 스냅샷으로 주기적으로 덮어써서 영속화한다.
    """
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_projects')
    title = models.CharField(max_length=200, default='제목 없는 프로젝트')
    bpm = models.PositiveIntegerField(default=90)
    key_tonic = models.PositiveSmallIntegerField(null=True, blank=True)  # 0=C ... 11=B
    key_mode = models.CharField(max_length=10, null=True, blank=True)  # 'major' | 'minor'
    is_public = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)  # {"tracks": [...]}
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


class ProjectCollaborator(models.Model):
    ROLE_EDITOR = 'editor'
    ROLE_CHOICES = [(ROLE_EDITOR, 'Editor')]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='collaborations')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_EDITOR)
    invited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f'{self.user} on {self.project} ({self.role})'
