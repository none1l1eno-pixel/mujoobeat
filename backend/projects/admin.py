from django.contrib import admin

from .models import Project, ProjectCollaborator


class CollaboratorInline(admin.TabularInline):
    model = ProjectCollaborator
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'owner', 'bpm', 'is_public', 'updated_at')
    list_filter = ('is_public',)
    search_fields = ('title', 'owner__email')
    inlines = [CollaboratorInline]
