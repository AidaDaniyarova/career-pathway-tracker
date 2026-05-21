from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from django.http import HttpResponse
from .models import CV, CVTemplate
from .serializers import CVSerializer, CVDetailSerializer, CVTemplateSerializer
from .services import ATSScanner, CVExportService


class CVTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CVTemplateSerializer
    queryset = CVTemplate.objects.filter(is_active=True)


class CVViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CVSerializer
    lookup_field = 'id'
    parser_classes = [MultiPartParser, JSONParser]

    def get_queryset(self):
        return CV.objects.filter(user=self.request.user).order_by('-is_default', '-updated_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CVDetailSerializer
        return CVSerializer

    def list(self, request, *args, **kwargs):
        """Return list of user's CVs as array"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)  # Return array directly

    def perform_create(self, serializer):
        if not CV.objects.filter(user=self.request.user).exists():
            serializer.save(user=self.request.user, is_default=True)
        else:
            serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='analyze')
    def analyze_cv(self, request, id=None):
        cv = self.get_object()
        job_description = request.data.get('job_description', '')

        scanner = ATSScanner()
        analysis = scanner.analyze_cv(cv.content, job_description)

        from decimal import Decimal
        cv.ats_score = Decimal(str(analysis['total_score']))
        cv.ats_feedback = analysis
        cv.save()

        return Response(analysis)

    @action(detail=True, methods=['post'], url_path='export-pdf')
    def export_pdf(self, request, id=None):
        cv = self.get_object()
        exporter = CVExportService()
        pdf_content = exporter.generate_pdf(cv)

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{cv.title or "cv"}.pdf"'
        return response

    @action(detail=True, methods=['post'], url_path='export-word')
    def export_word(self, request, id=None):
        cv = self.get_object()
        exporter = CVExportService()
        docx_content = exporter.generate_word(cv)

        response = HttpResponse(docx_content,
                                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        response['Content-Disposition'] = f'attachment; filename="{cv.title or "cv"}.docx"'
        return response

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, id=None):
        cv = self.get_object()

        CV.objects.filter(user=request.user, is_default=True).update(is_default=False)

        cv.is_default = True
        cv.save()

        return Response({'message': f'{cv.title} is now your default CV'})

    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate_cv(self, request, id=None):
        original = self.get_object()

        new_cv = CV.objects.create(
            user=request.user,
            title=f"{original.title} (Copy)",
            content=original.content,
            template=original.template
        )

        serializer = self.get_serializer(new_cv)
        return Response(serializer.data, status=status.HTTP_201_CREATED)