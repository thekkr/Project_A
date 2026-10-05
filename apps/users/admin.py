from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Roles', {'fields': ('roles',)}),
    )
    filter_horizontal = ('roles',) + UserAdmin.filter_horizontal
    list_display = ('username', 'email', 'is_active', 'is_staff')
