from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['email', 'password', 'display_name']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('이미 가입된 이메일입니다.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('display_name', ''),
        )

    display_name = serializers.CharField(write_only=True, required=False, allow_blank=True)


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='first_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'is_staff']


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    가입 시 username=email로 저장하므로, 인증 자체는 그대로 username_field(=username)를
    쓰되 클라이언트에게 노출되는 입력 필드 이름만 'email'로 바꾼다.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        del self.fields[self.username_field]
        self.fields['email'] = serializers.EmailField()

    def validate(self, attrs):
        attrs[self.username_field] = attrs.pop('email')
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
