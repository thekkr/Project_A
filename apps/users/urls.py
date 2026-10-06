from django.urls import path

from .views import UserViewSet

me_view = UserViewSet.as_view({'get': 'me'})
list_view = UserViewSet.as_view({'get': 'list'})
detail_view = UserViewSet.as_view({'get': 'retrieve'})
assign_roles = UserViewSet.as_view({'post': 'assign_roles'})
deactivate = UserViewSet.as_view({'post': 'deactivate'})
activate = UserViewSet.as_view({'post': 'activate'})
reassign_reviewer = UserViewSet.as_view({'post': 'reassign_reviewer'})

urlpatterns = [
    path('me/', me_view, name='user-me'),
    path('', list_view, name='user-list'),
    path('<int:pk>/', detail_view, name='user-detail'),
    path('<int:pk>/assign-roles/', assign_roles, name='user-assign-roles'),
    path('<int:pk>/deactivate/', deactivate, name='user-deactivate'),
    path('<int:pk>/activate/', activate, name='user-activate'),
    path('<int:pk>/reassign-reviewer/', reassign_reviewer, name='user-reassign-reviewer'),
]
