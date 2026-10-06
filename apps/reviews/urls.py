from django.urls import path

from .views import ReviewViewSet

pickup = ReviewViewSet.as_view({'post': 'pickup'})
publish = ReviewViewSet.as_view({'post': 'publish'})
send_back = ReviewViewSet.as_view({'post': 'send_back'})
history = ReviewViewSet.as_view({'get': 'history'})
my_decisions = ReviewViewSet.as_view({'get': 'my_decisions'})

urlpatterns = [
    path('reviews/my-decisions/', my_decisions, name='review-my-decisions'),
    path('articles/<int:pk>/pickup/', pickup, name='review-pickup'),
    path('articles/<int:pk>/publish/', publish, name='review-publish'),
    path('articles/<int:pk>/send-back/', send_back, name='review-send-back'),
    path('articles/<int:pk>/history/', history, name='review-history'),
]
