import django_filters

from .models import Article


class ArticleFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name='categories__id', distinct=True)
    category_slug = django_filters.CharFilter(field_name='categories__slug', lookup_expr='iexact', distinct=True)
    status = django_filters.ChoiceFilter(choices=Article.STATUS_CHOICES)
    author = django_filters.NumberFilter(field_name='author__id')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Article
        fields = ['category', 'category_slug', 'status', 'author', 'created_after', 'created_before']

