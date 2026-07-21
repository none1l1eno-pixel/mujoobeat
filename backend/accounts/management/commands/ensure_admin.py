"""
DJANGO_ADMIN_USERNAME/EMAIL/PASSWORD 환경변수로 관리자 계정을 멱등하게 보장한다.
Render 같은 무료 플랜은 one-off job이 안 돼서(paid 전용) 배포 buildCommand에
끼워 매번 실행 — 이미 있으면 값만 갱신, 없으면 새로 만든다.
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'DJANGO_ADMIN_USERNAME/EMAIL/PASSWORD 환경변수로 관리자 계정을 만들거나 갱신한다.'

    def handle(self, *args, **options):
        username = os.environ.get('DJANGO_ADMIN_USERNAME')
        email = os.environ.get('DJANGO_ADMIN_EMAIL')
        password = os.environ.get('DJANGO_ADMIN_PASSWORD')

        if not username or not email or not password:
            self.stdout.write('DJANGO_ADMIN_USERNAME/EMAIL/PASSWORD 중 빠진 게 있어 건너뜀')
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(username=username, defaults={'email': email})
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(f"{'생성' if created else '갱신'}됨: {username} ({email})")
