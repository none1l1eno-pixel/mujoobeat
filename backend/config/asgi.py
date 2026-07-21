"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from projects.jwt_auth_middleware import JWTAuthMiddleware  # noqa: E402
from projects.routing import websocket_urlpatterns as projects_ws_urlpatterns  # noqa: E402
from community.routing import websocket_urlpatterns as community_ws_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddleware(URLRouter(projects_ws_urlpatterns + community_ws_urlpatterns)),
})
