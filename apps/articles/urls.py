from rest_framework.routers import DefaultRouter

from .views import ArticleViewSet, CategoryViewSet, CommentViewSet

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('articles', ArticleViewSet, basename='article')
router.register('comments', CommentViewSet, basename='comment')

urlpatterns = router.urls
