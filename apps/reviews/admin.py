from django.contrib import admin

from .models import ReviewAssignment, ReviewHistory


@admin.register(ReviewAssignment)
class ReviewAssignmentAdmin(admin.ModelAdmin):
    list_display = ('article', 'reviewer', 'assigned_at')
    readonly_fields = ('assigned_at',)


@admin.register(ReviewHistory)
class ReviewHistoryAdmin(admin.ModelAdmin):
    list_display = ('article', 'editor', 'decision', 'created_at')
    list_filter = ('decision',)
    readonly_fields = ('created_at',)
