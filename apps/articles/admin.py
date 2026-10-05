from django.contrib import admin

from .models import Article, ArticleVersion, Category, InlineImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'status', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('title', 'author__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ArticleVersion)
class ArticleVersionAdmin(admin.ModelAdmin):
    list_display = ('article', 'edited_by', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(InlineImage)
class InlineImageAdmin(admin.ModelAdmin):
    list_display = ('image', 'uploaded_by', 'created_at')
    readonly_fields = ('created_at',)
