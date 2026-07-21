"""
DJANGO_ADMIN_EMAIL/PASSWORD 환경변수로 관리자 계정을 멱등하게 보장한다.
Render 같은 무료 플랜은 one-off job이 안 돼서(paid 전용) 배포 buildCommand에
끼워 매번 실행 — 이미 있으면 값만 갱신, 없으면 새로 만든다.

username은 반드시 email과 같아야 한다 — accounts/serializers.py의
EmailTokenObtainPairSerializer(사이트 자체 로그인 폼)가 입력받은 이메일을
그대로 username으로 매핑해 authenticate하기 때문에, username이 email과
다르면 "지정된 자격 증명에 해당하는 활성화된 사용자를 찾을 수 없습니다"
에러가 난다(Django admin 로그인은 username 필드라 이 문제와 무관하게
됐었음 — 그래서 admin만 되고 사이트 로그인은 안 됐던 것). DJANGO_ADMIN_NAME은
표시 이름(first_name)일 뿐 로그인 식별자가 아니다.
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'DJANGO_ADMIN_EMAIL/PASSWORD 환경변수로 관리자 계정을 만들거나 갱신한다.'

    def handle(self, *args, **options):
        email = os.environ.get('DJANGO_ADMIN_EMAIL')
        password = os.environ.get('DJANGO_ADMIN_PASSWORD')
        display_name = os.environ.get('DJANGO_ADMIN_NAME', '')

        if not email or not password:
            self.stdout.write('DJANGO_ADMIN_EMAIL/PASSWORD 중 빠진 게 있어 건너뜀')
            return

        User = get_user_model()
        # 예전에 username이 email과 다르게(예: "nada") 잘못 만들어졌을 수도 있어
        # email로 먼저 찾아 그 행을 그대로 정상화한다 — 중복 계정 안 생기게.
        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if created:
            user = User(username=email, email=email)

        user.username = email
        user.email = email
        user.first_name = display_name
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(f"{'생성' if created else '갱신'}됨: {email} (표시 이름: {display_name or '없음'})")
