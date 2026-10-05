import os

from .base import *  # noqa: F401, F403

DEBUG = True

if not os.environ.get('SECRET_KEY'):
    os.environ.setdefault('SECRET_KEY', 'dev-insecure-secret-key-not-for-production')

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-insecure-secret-key-not-for-production')

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
