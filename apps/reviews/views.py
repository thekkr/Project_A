from django.db import transaction
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.articles.models import Article
from apps.articles.serializers import ArticleDetailSerializer
from apps.users.permissions import IsEditorRole, IsNotArticleAuthor

from .models import ReviewAssignment, ReviewHistory
from .serializers import ReviewHistorySerializer


class ReviewDecisionSerializer(drf_serializers.Serializer):
    comment = drf_serializers.CharField(required=False, allow_blank=True, default='')


class ReviewViewSet(viewsets.ViewSet):
    """
    Editor-facing review actions. All require IsEditorRole.
    Self-review blocked by IsNotArticleAuthor on object level.
    """

    def _get_article(self, pk):
        try:
            return Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return None

    def _check_editor_permissions(self, request, article):
        """Return Response error if permission denied, else None."""
        if not request.user.is_authenticated or not request.user.is_editor:
            return Response({'detail': 'Editor role required.'}, status=status.HTTP_403_FORBIDDEN)
        if article.author == request.user:
            return Response(
                {'detail': 'Cannot review your own article.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    @action(detail=True, methods=['post'], url_path='pickup')
    def pickup(self, request, pk=None):
        """
        Editor picks up an IN_REVIEW article.
        Locks them in as sticky reviewer if not already assigned.
        """
        article = self._get_article(pk)
        if not article:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        err = self._check_editor_permissions(request, article)
        if err:
            return err

        if article.status != Article.IN_REVIEW:
            return Response(
                {'detail': 'Article is not IN_REVIEW.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment, created = ReviewAssignment.objects.get_or_create(
            article=article,
            defaults={'reviewer': request.user},
        )

        if not created and assignment.reviewer != request.user:
            return Response(
                {
                    'detail': 'Article already assigned to another editor.',
                    'reviewer': str(assignment.reviewer),
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                'detail': 'Picked up.' if created else 'Already your assignment.',
                'reviewer': str(assignment.reviewer),
                'article': article.id,
            }
        )

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        """
        Editor publishes an IN_REVIEW article.
        Must be the sticky reviewer (or admin reassigned them).
        """
        article = self._get_article(pk)
        if not article:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        err = self._check_editor_permissions(request, article)
        if err:
            return err

        if article.status != Article.IN_REVIEW:
            return Response(
                {'detail': 'Article is not IN_REVIEW.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        err = self._check_sticky_reviewer(request, article)
        if err:
            return err

        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            ReviewHistory.objects.create(
                article=article,
                editor=request.user,
                decision=ReviewHistory.PUBLISHED,
                comment=serializer.validated_data.get('comment', ''),
            )
            article.status = Article.PUBLISHED
            article.save(update_fields=['status', 'updated_at'])

        return Response(ArticleDetailSerializer(article).data)

    @action(detail=True, methods=['post'], url_path='send-back')
    def send_back(self, request, pk=None):
        """
        Editor sends article back for revision with a required comment.
        """
        article = self._get_article(pk)
        if not article:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        err = self._check_editor_permissions(request, article)
        if err:
            return err

        if article.status != Article.IN_REVIEW:
            return Response(
                {'detail': 'Article is not IN_REVIEW.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        err = self._check_sticky_reviewer(request, article)
        if err:
            return err

        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get('comment', '').strip()

        if not comment:
            return Response(
                {'detail': 'A comment is required when sending back for revision.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            ReviewHistory.objects.create(
                article=article,
                editor=request.user,
                decision=ReviewHistory.NEEDS_REVISION,
                comment=comment,
            )
            article.status = Article.NEEDS_REVISION
            article.save(update_fields=['status', 'updated_at'])

        return Response(ArticleDetailSerializer(article).data)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """Full review history for an article. Visible to author and editors."""
        article = self._get_article(pk)
        if not article:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not (request.user.is_editor or request.user == article.author or request.user.is_staff):
            return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)

        history = ReviewHistory.objects.filter(article=article)
        return Response(ReviewHistorySerializer(history, many=True).data)

    def _check_sticky_reviewer(self, request, article):
        """Return Response error if user is not the locked-in reviewer."""
        try:
            assignment = article.review_assignment
        except ReviewAssignment.DoesNotExist:
            return Response(
                {'detail': 'No reviewer assigned. Call /pickup first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if assignment.reviewer != request.user:
            return Response(
                {
                    'detail': 'This article is assigned to a different editor.',
                    'reviewer': str(assignment.reviewer),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return None
