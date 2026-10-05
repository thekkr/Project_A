from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Role, User
from .permissions import IsAdminRole
from .serializers import RoleAssignSerializer, UserDetailSerializer, UserListSerializer


class UserViewSet(viewsets.ViewSet):
    """
    Admin-only user management.
    Admins manage users and roles — zero article/review involvement.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def list(self, request):
        users = User.objects.prefetch_related('roles').order_by('username')
        return Response(UserListSerializer(users, many=True).data)

    def retrieve(self, request, pk=None):
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='assign-roles')
    def assign_roles(self, request, pk=None):
        """Replace user's role set with the provided list."""
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role_names = serializer.validated_data['roles']
        roles = Role.objects.filter(name__in=role_names)
        user.roles.set(roles)

        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """Deactivate user — preserves articles/authorship, blocks login."""
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response(
                {'detail': 'Cannot deactivate yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'detail': f'User {user.username} deactivated.'})

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        """Re-activate a deactivated user."""
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'detail': f'User {user.username} activated.'})

    @action(detail=True, methods=['post'], url_path='reassign-reviewer')
    def reassign_reviewer(self, request, pk=None):
        """
        Admin reassigns the sticky reviewer on an article.
        pk here is the USER being assigned as new reviewer.
        Expects: { "article_id": <int> }
        """
        new_reviewer = self._get_user(pk)
        if not new_reviewer:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not new_reviewer.is_editor:
            return Response(
                {'detail': 'New reviewer must hold Editor role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        article_id = request.data.get('article_id')
        if not article_id:
            return Response({'detail': 'article_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.articles.models import Article
        from apps.reviews.models import ReviewAssignment

        try:
            article = Article.objects.get(pk=article_id)
        except Article.DoesNotExist:
            return Response({'detail': 'Article not found.'}, status=status.HTTP_404_NOT_FOUND)

        if new_reviewer == article.author:
            return Response(
                {'detail': 'Cannot assign article author as reviewer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment, _ = ReviewAssignment.objects.update_or_create(
            article=article,
            defaults={'reviewer': new_reviewer},
        )
        return Response({
            'detail': 'Reviewer reassigned.',
            'article': article.id,
            'reviewer': str(new_reviewer),
        })

    def _get_user(self, pk):
        try:
            return User.objects.prefetch_related('roles').get(pk=pk)
        except User.DoesNotExist:
            return None
