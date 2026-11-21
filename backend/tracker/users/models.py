import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    """Custom user manager for the User model - using email as username"""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user using email"""
        if not email:
            raise ValueError('The Email field must be set')

        email = self.normalize_email(email)
        user = self.model(
            email=email,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser using email"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

    def get_by_natural_key(self, email):
        """Required for Django's authentication system"""
        return self.get(email=email)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User Model - Email as primary identifier"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    profile_picture = models.TextField(blank=True, null=True)

    # Profile fields
    bio = models.TextField(blank=True, default='')
    interests = models.JSONField(default=list, blank=True)
    education_level = models.CharField(max_length=50, blank=True, null=True)
    years_experience = models.IntegerField(default=0)
    current_job_title = models.CharField(max_length=100, blank=True, default='')

    # XP and level tracking
    total_xp = models.IntegerField(default=0)

    # AI-use consent (null = user has not answered yet)
    ai_consent = models.BooleanField(null=True, blank=True, default=None)
    ai_consent_at = models.DateTimeField(null=True, blank=True)
    ai_consent_version = models.CharField(max_length=32, blank=True, default='')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    # Use email as the unique identifier for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def get_short_name(self):
        return self.email.split('@')[0]

    @property
    def full_name(self):
        return self.get_full_name()

    @property
    def username(self):
        """For backward compatibility - return email prefix"""
        return self.email.split('@')[0]

    @property
    def current_level(self):
        return (self.total_xp // 100) + 1

    @property
    def has_valid_ai_consent(self):
        """True only if the user accepted the *current* version of the AI notice."""
        from django.conf import settings
        return bool(self.ai_consent) and self.ai_consent_version == settings.AI_CONSENT_VERSION

    def natural_key(self):
        return (self.email,)