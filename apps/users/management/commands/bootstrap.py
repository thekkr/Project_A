from django.core.management.base import BaseCommand
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Idempotent: create roles, categories, and grant all roles to the admin user.'

    ADMIN_EMAIL = 'kiranreddy6362@gmail.com'

    ROLES = ['AUTHOR', 'EDITOR', 'ADMIN']

    CATEGORIES = ['AI', 'Politics', 'Tech']

    def handle(self, *args, **options):
        from apps.articles.models import Category
        from apps.users.models import Role, User

        for name in self.ROLES:
            Role.objects.get_or_create(name=name)
        self.stdout.write('Roles OK')

        for name in self.CATEGORIES:
            Category.objects.get_or_create(name=name, defaults={'slug': slugify(name)})
        self.stdout.write('Categories OK')

        try:
            user = User.objects.get(email=self.ADMIN_EMAIL)
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])
            user.roles.set(Role.objects.all())
            self.stdout.write(f'Admin roles assigned to {self.ADMIN_EMAIL}')
        except User.DoesNotExist:
            self.stdout.write(f'User {self.ADMIN_EMAIL} not found — will be set up on first login')
