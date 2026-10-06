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


ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


import re as _re


def _allow_img_attributes(tag, name, value):
    if tag == 'img':
        if name in ('src', 'alt', 'width', 'height', 'data-align'):
            return True
        if name == 'style':
            # allow only width declarations
            return bool(_re.fullmatch(r'width\s*:\s*[\d.]+(%|px|em|rem)\s*;?', value.strip()))
        return False
    if tag == 'a' and name in ('href', 'title', 'rel'):
        return True
    return False


def sanitize_html(value: str) -> str:
    return bleach.clean(value, tags=ALLOWED_TAGS, attributes=_allow_img_attributes, strip=True)


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
    reviewer = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ('id', 'title', 'author', 'category', 'status', 'featured_image', 'created_at', 'reviewer')
        read_only_fields = fields

    def get_reviewer(self, obj):
        try:
            return str(obj.review_assignment.reviewer)
        except Exception:
            return None


class ArticleDetailSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    category = CategorySerializer(read_only=True)
    versions = ArticleVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Article
        fields = (
            'id', 'title', 'body', 'featured_image',
            'author', 'category', 'status',
            'created_at', 'updated_at',
            'versions',
        )
        read_only_fields = fields


class ArticleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ('id', 'title', 'body', 'featured_image', 'category', 'status')
        read_only_fields = ('id', 'status')

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError('Title must be at least 3 characters.')
        return value.strip()

    def validate_body(self, value):
        clean = sanitize_html(value)
        import re
        text_only = re.sub(r'<[^>]+>', '', clean).strip()
        if len(text_only) < 10:
            raise serializers.ValidationError('Body must contain at least 10 characters of text.')
        return clean

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
