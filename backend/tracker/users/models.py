import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class UserManager(BaseUserManager):
    """Custom user manager for the User model"""

    def create_user(self, username, email, password=None, **extra_fields):
        """Create and save a regular user"""
        if not email:
            raise ValueError('The Email field must be set')
        if not username:
            raise ValueError('The Username field must be set')

        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, email, password, **extra_fields)

    def get_by_natural_key(self, username):
        """Required for Django's authentication system"""
        return self.get(username=username)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User Model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    profile_picture = models.TextField(blank=True, null=True)
    education_level = models.CharField(max_length=50, blank=True, null=True)
    years_experience = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Use the custom manager
    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
        ]

    def __str__(self):
        return self.username

    def get_full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    def get_short_name(self):
        """Return the short name of the user"""
        return self.username

    @property
    def full_name(self):
        return self.get_full_name()

    def natural_key(self):
        """Required for Django's authentication system"""
        return (self.username,)