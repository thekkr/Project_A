import logging
import os
import re
import uuid

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework import status, viewsets
from rest_framework.throttling import AnonRateThrottle
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

from .models import Role, User
from .permissions import IsAdminRole
from .serializers import ProfileUpdateSerializer, RoleAssignSerializer, UserDetailSerializer, UserListSerializer


def _issue_jwt(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _derive_username(email: str) -> str:
    base = re.sub(r'[^a-zA-Z0-9_]', '_', email.split('@')[0])[:20] or 'user'
    return f'{base}_{uuid.uuid4().hex[:6]}'


class AuthRateThrottle(AnonRateThrottle):
    rate = '10/minute'


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    if not AuthRateThrottle().allow_request(request, None):
        return Response({'detail': 'Too many requests.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    """
    Accepts a Google ID token (credential), verifies it, finds or creates the user,
    and returns simplejwt access + refresh tokens.
    """
    credential = request.data.get('credential')
    if not credential:
        return Response({'detail': 'credential required.'}, status=status.HTTP_400_BAD_REQUEST)

    client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
    if not client_id:
        return Response({'detail': 'Google login not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        payload = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    except ValueError:
        logger.warning('Google token validation failed', exc_info=True)
        return Response({'detail': 'Invalid Google credential.'}, status=status.HTTP_400_BAD_REQUEST)

    email = payload.get('email', '').lower()
    if not email:
        return Response({'detail': 'No email in Google token.'}, status=status.HTTP_400_BAD_REQUEST)

    if not payload.get('email_verified'):
        return Response({'detail': 'Google email not verified.'}, status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': _derive_username(email),
            'first_name': payload.get('given_name', ''),
            'last_name': payload.get('family_name', ''),
            'avatar_url': payload.get('picture', ''),
        },
    )

    if not user.is_active:
        return Response({'detail': 'Account deactivated.'}, status=status.HTTP_403_FORBIDDEN)

    tokens = _issue_jwt(user)
    tokens['created'] = created
    tokens['has_roles'] = user.roles.exists()
    return Response(tokens)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass
    return Response({'detail': 'Logged out.'})


class UserViewSet(viewsets.ViewSet):
    """
    Admin-only user management.
    Admins manage users and roles — zero article/review involvement.
    `me` action is available to any authenticated user.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        if request.method == 'GET':
            return Response(UserDetailSerializer(request.user).data)
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDetailSerializer(request.user).data)

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
