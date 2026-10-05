from django.conf import settings
from django.db import models

from apps.articles.models import Article


class ReviewAssignment(models.Model):
    article = models.OneToOneField(
        Article,
        on_delete=models.CASCADE,
        related_name='review_assignment',
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='review_assignments',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.reviewer} reviewing "{self.article.title}"'


class ReviewHistory(models.Model):
    PUBLISHED = 'PUBLISHED'
    NEEDS_REVISION = 'NEEDS_REVISION'

    DECISION_CHOICES = [
        (PUBLISHED, 'Published'),
        (NEEDS_REVISION, 'Needs Revision'),
    ]

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='review_history',
    )
    editor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='review_history',
    )
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'review histories'

    def __str__(self):
        return f'{self.decision} on "{self.article.title}" by {self.editor}'
