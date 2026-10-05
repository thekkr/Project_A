from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Article(models.Model):
    DRAFT = 'DRAFT'
    IN_REVIEW = 'IN_REVIEW'
    NEEDS_REVISION = 'NEEDS_REVISION'
    PUBLISHED = 'PUBLISHED'

    STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (IN_REVIEW, 'In Review'),
        (NEEDS_REVISION, 'Needs Revision'),
        (PUBLISHED, 'Published'),
    ]

    title = models.CharField(max_length=300)
    body = models.TextField()
    featured_image = models.ImageField(upload_to='featured/', blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='articles')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='articles',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def can_edit(self, user) -> bool:
        return user == self.author and self.status in (self.DRAFT, self.NEEDS_REVISION)


class ArticleVersion(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='versions')
    body = models.TextField()
    edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='article_versions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Version of "{self.article.title}" at {self.created_at}'


class InlineImage(models.Model):
    image = models.ImageField(upload_to='inline/')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_images',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.image.name
