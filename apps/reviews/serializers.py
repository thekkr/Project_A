from rest_framework import serializers

from .models import ReviewHistory


class ReviewHistorySerializer(serializers.ModelSerializer):
    editor = serializers.StringRelatedField()

    class Meta:
        model = ReviewHistory
        fields = ('id', 'editor', 'decision', 'comment', 'created_at')
        read_only_fields = fields
