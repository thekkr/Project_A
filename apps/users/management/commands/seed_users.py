from django.core.management.base import BaseCommand

from apps.users.models import Role, User

SEED_USERS = [
    {
        'username': 'author1',
        'email': 'author@test.com',
        'password': 'test1234',
        'roles': [Role.AUTHOR],
    },
    {
        'username': 'editor1',
        'email': 'editor@test.com',
        'password': 'test1234',
        'roles': [Role.EDITOR],
    },
    {
        'username': 'admin1',
        'email': 'admin@test.com',
        'password': 'test1234',
        'roles': [Role.ADMIN],
    },
]


class Command(BaseCommand):
    help = 'Create seed users for development/testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing seed users before creating',
        )

    def handle(self, *args, **options):
        # Ensure all roles exist
        for role_name in [Role.AUTHOR, Role.EDITOR, Role.ADMIN]:
            Role.objects.get_or_create(name=role_name)

        if options['reset']:
            usernames = [u['username'] for u in SEED_USERS]
            deleted, _ = User.objects.filter(username__in=usernames).delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing seed users.'))

        for data in SEED_USERS:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={'email': data['email']},
            )
            if created:
                user.set_password(data['password'])
                user.save()
                roles = Role.objects.filter(name__in=data['roles'])
                user.roles.set(roles)
                self.stdout.write(
                    self.style.SUCCESS(f"Created user '{user.username}' with roles {data['roles']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"User '{user.username}' already exists — skipped.")
                )

        self.stdout.write(self.style.SUCCESS('Done. Password for all seed users: test1234'))
