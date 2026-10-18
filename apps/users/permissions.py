from rest_framework.permissions import BasePermission

from .models import Role


def _is_admin(user):
    return bool(user and user.is_authenticated and user.is_site_admin)


class IsAuthorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_author or _is_admin(request.user)))


class IsEditorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_editor or _is_admin(request.user)))


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return _is_admin(request.user)


class IsAuthorOrEditorRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_author or request.user.is_editor or _is_admin(request.user))
        )


class CanEditArticle(BasePermission):
    """Allow the article's author (DRAFT/NEEDS_REVISION) or any admin."""

    def has_object_permission(self, request, view, obj):
        return _is_admin(request.user) or obj.can_edit(request.user)


class CanUpdateArticle(BasePermission):
    """
    Author editing own DRAFT/NEEDS_REVISION, OR
    Editor editing IN_REVIEW article (for copyediting before publish), OR
    Admin editing any article.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if _is_admin(user):
            return True
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
