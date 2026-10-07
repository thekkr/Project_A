from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    AUTHOR = 'AUTHOR'
    EDITOR = 'EDITOR'
    ADMIN = 'ADMIN'

    ROLE_CHOICES = [
        (AUTHOR, 'Author'),
        (EDITOR, 'Editor'),
        (ADMIN, 'Admin'),
    ]

    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    roles = models.ManyToManyField(Role, blank=True, related_name='users')
    bio = models.TextField(blank=True, default='')
    avatar_url = models.URLField(blank=True, default='')

    def has_role(self, role_name: str) -> bool:
        return self.roles.filter(name=role_name).exists()

    @property
    def is_author(self) -> bool:
        return self.has_role(Role.AUTHOR)

    @property
    def is_editor(self) -> bool:
        return self.has_role(Role.EDITOR)

    @property
    def is_site_admin(self) -> bool:
        return self.has_role(Role.ADMIN)
