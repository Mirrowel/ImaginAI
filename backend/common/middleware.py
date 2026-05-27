from __future__ import annotations

from django.middleware.csrf import CsrfViewMiddleware


class ApiCsrfMiddleware:
    """Enforce CSRF on unsafe `/api/` browser requests even if a route wrapper is exempt."""

    def __init__(self, get_response):
        """Store the downstream handler and a reusable Django CSRF checker."""
        self.get_response = get_response
        self.csrf = CsrfViewMiddleware(get_response)

    def __call__(self, request):
        """Reject unsafe API requests without a valid CSRF token before route handling."""
        if request.path.startswith("/api/") and request.method not in {"GET", "HEAD", "OPTIONS", "TRACE"}:
            self.csrf.process_request(request)
            rejection = self.csrf.process_view(request, lambda request: None, (), {})
            if rejection is not None:
                return rejection
        return self.get_response(request)
