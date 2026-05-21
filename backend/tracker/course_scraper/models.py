import uuid
from django.db import models

class CrawlLog(models.Model):
    """Log of course crawling activities"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    search_terms = models.JSONField(default=list)
    max_courses = models.IntegerField(default=20)
    career_path = models.ForeignKey('learning.CareerPath', on_delete=models.SET_NULL, null=True, blank=True)

    # Results
    courses_found = models.IntegerField(default=0)
    courses_created = models.IntegerField(default=0)
    courses_updated = models.IntegerField(default=0)

    # Status
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)

    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'crawl_logs'
        ordering = ['-started_at']

    def __str__(self):
        return f"Crawl {self.started_at.strftime('%Y-%m-%d %H:%M')} - {self.status}"