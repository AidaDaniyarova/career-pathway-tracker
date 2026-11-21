import os

from django.http import JsonResponse

HEALTH_PATH = '/api/health/'


class HealthCheckMiddleware:
    """Answers the platform health check before any other middleware runs.

    Placed first so the probe isn't rejected by ALLOWED_HOSTS or redirected by
    SECURE_SSL_REDIRECT (Render probes the container directly over plain HTTP).
    It deliberately doesn't touch the database, so health checks don't keep
    Neon's free compute awake.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Render sets RENDER_GIT_COMMIT; it shows which commit is live
        self.commit = os.getenv('RENDER_GIT_COMMIT', '')[:7] or None

    def __call__(self, request):
        if request.path == HEALTH_PATH and request.method in ('GET', 'HEAD'):
            return JsonResponse({'status': 'ok', 'commit': self.commit})
        return self.get_response(request)
