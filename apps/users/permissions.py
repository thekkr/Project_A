from rest_framework.permissions import BasePermission

from .models import Role


class IsAuthorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_author)


class IsEditorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_editor)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_site_admin)


class IsAuthorOrEditorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_author or request.user.is_editor)
        )


class CanEditArticle(BasePermission):
    """Allow only the article's author when status is DRAFT or NEEDS_REVISION."""

    def has_object_permission(self, request, view, obj):
        return obj.can_edit(request.user)


class CanUpdateArticle(BasePermission):
    """
    Author editing own DRAFT/NEEDS_REVISION, OR
    Editor editing IN_REVIEW article (for copyediting before publish).
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if obj.can_edit(user):
            return True
        from apps.articles.models import Article
        if user.is_editor and obj.status == Article.IN_REVIEW:
            return True
        return False


class IsNotArticleAuthor(BasePermission):
    """Prevent self-review: requester must not be the article's author."""

    def has_object_permission(self, request, view, obj):
        return obj.author != request.user
