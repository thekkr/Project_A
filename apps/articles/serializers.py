import bleach
from rest_framework import serializers

from .models import Article, ArticleVersion, Category, InlineImage

ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's',
    'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
]

ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'rel'],
    'img': ['src', 'alt', 'width', 'height'],
}

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def sanitize_html(value: str) -> str:
    return bleach.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug')
        read_only_fields = ('slug',)


class ArticleVersionSerializer(serializers.ModelSerializer):
    edited_by = serializers.StringRelatedField()

    class Meta:
        model = ArticleVersion
        fields = ('id', 'body', 'edited_by', 'created_at')
        read_only_fields = fields


class ArticleListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Article
        fields = ('id', 'title', 'author', 'category', 'status', 'featured_image', 'created_at')
        read_only_fields = fields


class ArticleDetailSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    category = CategorySerializer(read_only=True)
    review_history = serializers.SerializerMethodField()
    versions = ArticleVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Article
        fields = (
            'id', 'title', 'body', 'featured_image',
            'author', 'category', 'status',
            'created_at', 'updated_at',
            'review_history', 'versions',
        )
        read_only_fields = fields

    def get_review_history(self, obj):
        from apps.reviews.serializers import ReviewHistorySerializer
        return ReviewHistorySerializer(obj.review_history.all(), many=True).data


class ArticleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ('id', 'title', 'body', 'featured_image', 'category', 'status')
        read_only_fields = ('id', 'status')

    def validate_body(self, value):
        return sanitize_html(value)

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class InlineImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = InlineImage
        fields = ('id', 'image')

    def validate_image(self, value):
        if hasattr(value, 'content_type') and value.content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f'Unsupported image type. Allowed: jpeg, png, gif, webp.'
            )
        if value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError('Image exceeds 5 MB limit.')
        return value

    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)
