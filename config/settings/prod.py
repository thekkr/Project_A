import os

from .base import *  # noqa: F401, F403

DEBUG = False

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = False  # Railway handles SSL termination upstream
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

STATIC_ROOT = BASE_DIR / 'staticfiles'  # noqa: F405

CSRF_TRUSTED_ORIGINS = os.environ.get(  # noqa: F405
    'CSRF_TRUSTED_ORIGINS',
    'https://projecta-production-77b2.up.railway.app'
).split(',')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
