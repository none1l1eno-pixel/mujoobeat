from rest_framework import permissions


class IsOwnerOrCollaboratorOrPublicReadOnly(permissions.BasePermission):
    """
    조회: 소유자, 협업자, 또는 is_public 프로젝트는 로그인한 누구나.
    수정: 소유자 또는 협업자(editor)만. 삭제/협업자 관리: 소유자만.
    관리자(is_staff)는 공개 여부/소유자 상관없이 전부 조회·수정·삭제 가능.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff:
            return True

        is_owner = obj.owner_id == user.id
        is_collaborator = obj.collaborators.filter(user_id=user.id).exists()

        if request.method in permissions.SAFE_METHODS:
            return is_owner or is_collaborator or obj.is_public

        if view.action == 'destroy' or view.action in ('add_collaborator', 'remove_collaborator'):
            return is_owner

        return is_owner or is_collaborator
