from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.users.permissions import CanEditArticle, IsAuthorOrEditorRole, IsAuthorRole

from .models import Article, ArticleVersion, Category, InlineImage
from .serializers import (
    ArticleDetailSerializer,
    ArticleListSerializer,
    ArticleVersionSerializer,
    ArticleWriteSerializer,
    CategorySerializer,
    InlineImageSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Article.objects.filter(status=Article.PUBLISHED)
        if user.is_editor or user.is_staff:
            return Article.objects.all()
        if user.is_author:
            from django.db.models import Q
            return Article.objects.filter(
                Q(author=user) | Q(status=Article.PUBLISHED)
            )
        return Article.objects.filter(status=Article.PUBLISHED)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ArticleWriteSerializer
        if self.action == 'retrieve':
            return ArticleDetailSerializer
        return ArticleListSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsAuthorRole()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), CanEditArticle()]
        if self.action == 'submit':
            return [IsAuthenticated(), CanEditArticle()]
        if self.action == 'versions':
            return [IsAuthenticated()]
        if self.action == 'upload_image':
            return [IsAuthenticated(), IsAuthorOrEditorRole()]
        return super().get_permissions()

    def perform_update(self, serializer):
        article = self.get_object()
        user = self.request.user
        new_body = serializer.validated_data.get('body')

        with transaction.atomic():
            # Snapshot current body if editor is changing it
            if user.is_editor and new_body and new_body != article.body:
                ArticleVersion.objects.create(
                    article=article,
                    body=article.body,
                    edited_by=user,
                )
            serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        article = self.get_object()
        if article.status not in (Article.DRAFT, Article.NEEDS_REVISION):
            return Response(
                {'detail': 'Only DRAFT or NEEDS_REVISION articles can be submitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        article.status = Article.IN_REVIEW
        article.save(update_fields=['status', 'updated_at'])
        return Response(ArticleDetailSerializer(article).data)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        article = self.get_object()
        user = request.user
        if not (user.is_editor or user.is_staff or article.author == user):
            return Response(
                {'detail': 'Not permitted.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        versions = article.versions.all()
        return Response(ArticleVersionSerializer(versions, many=True).data)

    @action(detail=False, methods=['post'], url_path='upload-image')
    def upload_image(self, request):
        serializer = InlineImageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            {'id': instance.id, 'url': request.build_absolute_uri(instance.image.url)},
            status=status.HTTP_201_CREATED,
        )
