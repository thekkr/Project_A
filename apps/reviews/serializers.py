from rest_framework import serializers

from .models import ReviewHistory


class ReviewHistorySerializer(serializers.ModelSerializer):
    editor = serializers.StringRelatedField()

    class Meta:
        model = ReviewHistory
        fields = ('id', 'editor', 'decision', 'comment', 'created_at')
        read_only_fields = fields


class ReviewHistoryWithArticleSerializer(serializers.ModelSerializer):
    editor = serializers.StringRelatedField()
    article_id = serializers.IntegerField(source='article.id', read_only=True)
    article_title = serializers.CharField(source='article.title', read_only=True)
    article_status = serializers.CharField(source='article.status', read_only=True)
    article_author = serializers.StringRelatedField(source='article.author', read_only=True)

    class Meta:
        model = ReviewHistory
        fields = ('id', 'editor', 'decision', 'comment', 'created_at',
                  'article_id', 'article_title', 'article_status', 'article_author')
        read_only_fields = fields
