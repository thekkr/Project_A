from rest_framework import serializers

from .models import Role, User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('id', 'name')


class UserListSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_active', 'roles', 'date_joined')
        read_only_fields = fields


class UserDetailSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'bio', 'avatar_url', 'is_active', 'roles', 'date_joined', 'last_login')
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'bio')

    def validate_username(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError('Username must be at least 3 characters.')
        qs = User.objects.filter(username=value).exclude(pk=self.instance.pk if self.instance else None)
        if qs.exists():
            raise serializers.ValidationError('Username already taken.')
        return value


class RoleAssignSerializer(serializers.Serializer):
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=[Role.AUTHOR, Role.EDITOR, Role.ADMIN]),
        allow_empty=True,
    )
