from django.contrib import admin
from .models import CareerQuiz, QuizQuestion, QuizOption, QuizResponse
from learning.models import CareerPath


class QuizOptionInline(admin.TabularInline):
    model = QuizOption
    extra = 1
    fields = ['option_text', 'order', 'career_weights']


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1
    fields = ['question_text', 'question_type', 'order', 'is_active', 'ranking_items']


@admin.register(CareerQuiz)
class CareerQuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'get_question_count', 'order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'description']
    list_editable = ['is_active', 'order']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [QuizQuestionInline]

    def get_question_count(self, obj):
        return obj.questions.filter(is_active=True).count()

    get_question_count.short_description = 'Active Questions'


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ['get_quiz_title', 'question_preview', 'question_type', 'order', 'is_active']
    list_filter = ['quiz', 'question_type', 'is_active']
    search_fields = ['question_text', 'quiz__title']
    list_editable = ['order', 'is_active']
    inlines = [QuizOptionInline]

    def get_quiz_title(self, obj):
        return obj.quiz.title

    get_quiz_title.short_description = 'Quiz'

    def question_preview(self, obj):
        return obj.question_text[:75] + '...' if len(obj.question_text) > 75 else obj.question_text

    question_preview.short_description = 'Question'


@admin.register(QuizOption)
class QuizOptionAdmin(admin.ModelAdmin):
    list_display = ['option_preview', 'get_question_preview', 'order', 'has_weights']
    list_filter = ['question__quiz']
    search_fields = ['option_text', 'question__question_text']
    list_editable = ['order']

    def option_preview(self, obj):
        return obj.option_text[:50] + '...' if len(obj.option_text) > 50 else obj.option_text

    option_preview.short_description = 'Option'

    def get_question_preview(self, obj):
        return obj.question.question_text[:50] + '...' if len(
            obj.question.question_text) > 50 else obj.question.question_text

    get_question_preview.short_description = 'Question'

    def has_weights(self, obj):
        return bool(obj.career_weights)

    has_weights.boolean = True
    has_weights.short_description = 'Has Career Weights'


@admin.register(QuizResponse)
class QuizResponseAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'quiz_title', 'completed_at', 'recommended_career_path']
    list_filter = ['quiz', 'completed_at']
    search_fields = ['user__email', 'user__username', 'quiz__title']
    readonly_fields = ['id', 'user', 'quiz', 'responses', 'career_scores', 'recommended_career_path_id', 'completed_at',
                       'ip_address']
    date_hierarchy = 'completed_at'

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = 'User'

    def quiz_title(self, obj):
        return obj.quiz.title

    quiz_title.short_description = 'Quiz'

    def recommended_career_path(self, obj):
        if obj.recommended_career_path_id:
            try:
                career_path = CareerPath.objects.get(id=obj.recommended_career_path_id)
                return career_path.title
            except:
                return obj.recommended_career_path_id
        return '-'

    recommended_career_path.short_description = 'Recommended Path'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False