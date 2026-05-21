import re
from collections import Counter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from io import BytesIO
from docx.enum.table import WD_TABLE_ALIGNMENT

class ATSScanner:
    """ATS Compatibility Scanner for CVs"""

    def __init__(self):
        # Common skills database
        self.technical_skills = {
            'programming': ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
                            'swift', 'kotlin'],
            'web_frontend': ['react', 'angular', 'vue', 'next.js', 'html', 'css', 'sass', 'tailwind', 'bootstrap'],
            'web_backend': ['django', 'flask', 'fastapi', 'spring', 'node.js', 'express', 'laravel', 'rails'],
            'database': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb'],
            'cloud_devops': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab'],
            'data_science': ['pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'spark', 'hadoop'],
            'security': ['cybersecurity', 'penetration testing', 'encryption', 'oauth', 'jwt', 'ssl'],
        }

        self.soft_skills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
            'time management', 'adaptability', 'creativity', 'project management', 'agile', 'scrum'
        ]

        self.action_verbs = [
            'achieved', 'increased', 'decreased', 'improved', 'reduced', 'saved', 'generated',
            'led', 'managed', 'created', 'developed', 'implemented', 'designed', 'built',
            'launched', 'delivered', 'optimized', 'transformed', 'accelerated', 'spearheaded'
        ]

    def analyze_cv(self, cv_content, job_description=None):
        """Analyze CV and calculate ATS score"""
        cv_text = self._extract_text(cv_content)

        # Base scores
        scores = {
            'formatting': self._check_formatting(cv_text),
            'structure': self._check_structure(cv_content),
            'keywords': 0,
            'achievements': self._check_achievements(cv_text),
            'ats_friendly': self._check_ats_friendly(cv_content)
        }

        # Keyword matching if job description provided
        if job_description:
            scores['keywords'] = self._check_keywords(cv_text, job_description)

        # Calculate total score
        total_score = (
                scores['formatting'] * 0.15 +
                scores['structure'] * 0.20 +
                scores['keywords'] * 0.35 +
                scores['achievements'] * 0.20 +
                scores['ats_friendly'] * 0.10
        )

        return {
            'total_score': round(total_score, 2),
            'breakdown': {
                'formatting': round(scores['formatting'], 2),
                'structure': round(scores['structure'], 2),
                'keywords': round(scores['keywords'], 2),
                'achievements': round(scores['achievements'], 2),
                'ats_friendly': round(scores['ats_friendly'], 2)
            },
            'feedback': self._generate_feedback(scores, cv_text, job_description),
            'matched_keywords': self._get_matched_keywords(cv_text, job_description) if job_description else [],
            'missing_keywords': self._get_missing_keywords(cv_text, job_description) if job_description else []
        }

    def _extract_text(self, cv_content):
        """Extract all text from CV JSON content"""
        text_parts = []

        # Personal info
        if 'personal_info' in cv_content:
            for value in cv_content['personal_info'].values():
                if isinstance(value, str):
                    text_parts.append(value)

        # Summary
        if 'summary' in cv_content:
            text_parts.append(cv_content['summary'])

        # Work experience
        if 'work_experience' in cv_content:
            for exp in cv_content['work_experience']:
                text_parts.append(exp.get('title', ''))
                text_parts.append(exp.get('company', ''))
                text_parts.append(exp.get('description', ''))

        # Education
        if 'education' in cv_content:
            for edu in cv_content['education']:
                text_parts.append(edu.get('degree', ''))
                text_parts.append(edu.get('institution', ''))

        # Skills
        if 'skills' in cv_content:
            if isinstance(cv_content['skills'], list):
                text_parts.extend(cv_content['skills'])
            elif isinstance(cv_content['skills'], dict):
                for skill_list in cv_content['skills'].values():
                    if isinstance(skill_list, list):
                        text_parts.extend(skill_list)

        return ' '.join(text_parts).lower()

    def _check_formatting(self, cv_text):
        """Check CV formatting (15% of total score)"""
        score = 100

        # Check for special characters
        special_chars = re.findall(r'[^\w\s\.\,\-\@\/\+\#\*]', cv_text)
        if special_chars:
            score -= min(20, len(special_chars))

        # Check for excessive ALL CAPS
        all_caps = re.findall(r'\b[A-Z]{5,}\b', cv_text)
        if len(all_caps) > 10:
            score -= 15

        # Check for bullet points (good)
        bullet_count = cv_text.count('•') + cv_text.count('- ') + cv_text.count('* ')
        if bullet_count > 10:
            score += 10
        elif bullet_count > 5:
            score += 5

        # Check length (250-800 words is ideal)
        word_count = len(cv_text.split())
        if 250 <= word_count <= 800:
            score += 10
        elif word_count < 150:
            score -= 20
        elif word_count > 1000:
            score -= 10

        return max(0, min(100, score))

    def _check_structure(self, cv_content):
        """Check CV structure (20% of total score)"""
        score = 0
        required_sections = ['personal_info', 'work_experience', 'education', 'skills']
        optional_sections = ['summary', 'certifications', 'projects', 'languages']

        for section in required_sections:
            if section in cv_content and cv_content[section]:
                score += 15  # 4 sections * 15 = 60 max

        for section in optional_sections:
            if section in cv_content and cv_content[section]:
                score += 10  # Up to 40 additional

        return min(100, score)

    def _check_keywords(self, cv_text, job_description):
        """Check keyword matching (35% of total score)"""
        # Extract keywords from job description
        job_text = job_description.lower()
        words = re.findall(r'\b[a-z]{3,}\b', job_text)
        stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'from', 'they',
                      'will', 'what', 'your', 'you', 'can', 'all', 'been', 'had', 'our', 'may', 'its', 'also', 'than',
                      'then', 'only', 'other', 'such', 'out', 'up', 'down', 'into', 'over', 'under', 'again', 'further',
                      'once', 'here', 'there', 'where', 'when', 'why', 'how', 'each', 'few', 'more', 'most', 'some',
                      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but',
                      'do', 'does', 'doing', 'their', 'them', 'they', 'these', 'those', 'upon', 'were', 'would',
                      'could', 'should', 'might', 'must'}

        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        keyword_freq = Counter(keywords)
        top_keywords = [k for k, v in keyword_freq.most_common(30)]

        # Count matches
        matched = 0
        for keyword in top_keywords:
            if keyword in cv_text:
                matched += 1

        if top_keywords:
            score = (matched / len(top_keywords)) * 100
        else:
            score = 50

        return min(100, score)

    def _check_achievements(self, cv_text):
        """Check for action verbs and quantifiable achievements (20% of total score)"""
        score = 0

        # Count action verbs
        for verb in self.action_verbs:
            if verb in cv_text:
                score += 3

        # Check for percentages
        percentages = re.findall(r'\d+%', cv_text)
        score += min(15, len(percentages) * 3)

        # Check for numbers (quantifiable results)
        numbers = re.findall(r'\b\d+\b', cv_text)
        score += min(10, len(numbers) // 3)

        # Check for currency
        currency = re.findall(r'\$\d+', cv_text)
        score += min(10, len(currency) * 2)

        return min(100, score)

    def _check_ats_friendly(self, cv_content):
        """Check ATS-friendly formatting (10% of total score)"""
        score = 100

        # Check for tables
        if 'table' in str(cv_content).lower():
            score -= 30

        # Check for columns
        if 'columns' in str(cv_content).lower():
            score -= 20

        # Check for images
        if 'image' in str(cv_content).lower() or 'photo' in str(cv_content).lower():
            score -= 20

        return max(0, score)

    def _generate_feedback(self, scores, cv_text, job_description):
        """Generate actionable feedback"""
        feedback = []

        if scores['formatting'] < 70:
            feedback.append("📝 Improve formatting: Use consistent bullet points and avoid special characters.")

        if scores['structure'] < 60:
            feedback.append("📋 Add missing sections: Ensure you have Education, Work Experience, and Skills sections.")

        if scores['keywords'] < 60 and job_description:
            feedback.append("🔑 Improve keyword matching: Add more relevant keywords from the job description.")

        if scores['achievements'] < 60:
            feedback.append("⭐ Add quantifiable achievements: Use action verbs and include numbers/percentages.")

        if scores['ats_friendly'] < 70:
            feedback.append("🤖 Make ATS-friendly: Avoid tables, columns, and images. Use simple formatting.")

        if len(feedback) == 0:
            feedback.append("✅ Your CV looks great! It's well-optimized for ATS systems.")

        # Check length
        word_count = len(cv_text.split())
        if word_count < 250:
            feedback.append("📏 CV is too short. Aim for 300-500 words.")
        elif word_count > 800:
            feedback.append("📏 CV is too long. Aim for 300-500 words.")

        return feedback

    def _get_matched_keywords(self, cv_text, job_description):
        """Get keywords that matched"""
        job_text = job_description.lower()
        words = re.findall(r'\b[a-z]{3,}\b', job_text)
        stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'from', 'they',
                      'will', 'what', 'your', 'you', 'can', 'all', 'been', 'had', 'our', 'may', 'its', 'also', 'than',
                      'then', 'only', 'other', 'such', 'out', 'up', 'down', 'into', 'over', 'under', 'again', 'further',
                      'once', 'here', 'there', 'where', 'when', 'why', 'how', 'each', 'few', 'more', 'most', 'some',
                      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but',
                      'do', 'does', 'doing', 'their', 'them', 'they', 'these', 'those', 'upon', 'were', 'would',
                      'could', 'should', 'might', 'must'}

        keywords = set([w for w in words if w not in stop_words and len(w) > 2])
        matched = [kw for kw in keywords if kw in cv_text]
        return matched[:20]

    def _get_missing_keywords(self, cv_text, job_description):
        """Get keywords that are missing"""
        job_text = job_description.lower()
        words = re.findall(r'\b[a-z]{3,}\b', job_text)
        stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'from', 'they',
                      'will', 'what', 'your', 'you', 'can', 'all', 'been', 'had', 'our', 'may', 'its', 'also', 'than',
                      'then', 'only', 'other', 'such', 'out', 'up', 'down', 'into', 'over', 'under', 'again', 'further',
                      'once', 'here', 'there', 'where', 'when', 'why', 'how', 'each', 'few', 'more', 'most', 'some',
                      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but',
                      'do', 'does', 'doing', 'their', 'them', 'they', 'these', 'those', 'upon', 'were', 'would',
                      'could', 'should', 'might', 'must'}

        keywords = set([w for w in words if w not in stop_words and len(w) > 2])
        missing = [kw for kw in keywords if kw not in cv_text]
        return missing[:20]


class CVExportService:
    """Service for exporting CVs to PDF and Word"""

    def __init__(self):
        pass

    def generate_pdf(self, cv):
        """Generate a proper PDF from CV content using ReportLab"""
        content = cv.content
        buffer = BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        # Styles
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=12,
            alignment=TA_CENTER
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=8,
            spaceBefore=12,
            borderWidth=0,
            borderPadding=5
        )

        subheading_style = ParagraphStyle(
            'CustomSubheading',
            parent=styles['Normal'],
            fontSize=12,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#374151'),
            spaceAfter=4
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY
        )

        company_style = ParagraphStyle(
            'CompanyStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=6
        )

        story = []

        # Personal Information
        personal = content.get('personal_info', {})
        name = personal.get('name', 'Curriculum Vitae')
        story.append(Paragraph(name, title_style))

        # Contact info
        contact_lines = []
        if personal.get('email'):
            contact_lines.append(f"Email: {personal.get('email')}")
        if personal.get('phone'):
            contact_lines.append(f"Phone: {personal.get('phone')}")
        if personal.get('location'):
            contact_lines.append(f"Location: {personal.get('location')}")

        if contact_lines:
            contact_text = " | ".join(contact_lines)
            story.append(Paragraph(contact_text, company_style))

        story.append(Spacer(1, 12))

        # Summary
        if content.get('summary'):
            story.append(Paragraph("Professional Summary", heading_style))
            story.append(Paragraph(content['summary'], normal_style))
            story.append(Spacer(1, 12))

        # Work Experience
        if content.get('work_experience'):
            story.append(Paragraph("Work Experience", heading_style))
            for exp in content['work_experience']:
                job_title = exp.get('title', '')
                company = exp.get('company', '')
                dates = exp.get('dates', '')

                title_text = f"<b>{job_title}</b>"
                if company:
                    title_text += f" at {company}"
                story.append(Paragraph(title_text, subheading_style))

                if dates:
                    story.append(Paragraph(dates, company_style))

                description = exp.get('description', '')
                # Convert bullet points to proper list
                if '•' in description or '- ' in description:
                    lines = description.replace('•', '-').split('\n')
                    for line in lines:
                        if line.strip():
                            story.append(Paragraph(f"• {line.strip()}", normal_style))
                else:
                    story.append(Paragraph(description, normal_style))

                story.append(Spacer(1, 8))
            story.append(Spacer(1, 4))

        # Education
        if content.get('education'):
            story.append(Paragraph("Education", heading_style))
            for edu in content['education']:
                degree = edu.get('degree', '')
                institution = edu.get('institution', '')
                dates = edu.get('dates', '')

                edu_text = f"<b>{degree}</b>"
                if institution:
                    edu_text += f" - {institution}"
                story.append(Paragraph(edu_text, subheading_style))

                if dates:
                    story.append(Paragraph(dates, company_style))
                if edu.get('grade'):
                    story.append(Paragraph(f"Grade: {edu.get('grade')}", normal_style))

                story.append(Spacer(1, 8))
            story.append(Spacer(1, 4))

        # Skills
        if content.get('skills'):
            story.append(Paragraph("Skills", heading_style))
            skills = content['skills']
            if isinstance(skills, list):
                # Create a table for skills to display in columns
                skill_data = []
                row = []
                for i, skill in enumerate(skills):
                    row.append(Paragraph(f"• {skill}", normal_style))
                    if len(row) == 3:
                        skill_data.append(row)
                        row = []
                if row:
                    skill_data.append(row)

                if skill_data:
                    table = Table(skill_data, colWidths=[2.2 * inch, 2.2 * inch, 2.2 * inch])
                    table.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 5),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ]))
                    story.append(table)
            elif isinstance(skills, dict):
                for category, skill_list in skills.items():
                    story.append(Paragraph(f"<b>{category}:</b>", normal_style))
                    story.append(Paragraph(", ".join(skill_list), normal_style))
                    story.append(Spacer(1, 6))

        # Certifications
        if content.get('certifications'):
            story.append(Spacer(1, 12))
            story.append(Paragraph("Certifications", heading_style))
            for cert in content['certifications']:
                story.append(Paragraph(f"• {cert}", normal_style))

        # Build PDF
        doc.build(story)

        pdf_content = buffer.getvalue()
        buffer.close()
        return pdf_content

    def generate_word(self, cv):
        """Generate Word document from CV"""
        doc = Document()
        content = cv.content

        # Title
        personal = content.get('personal_info', {})
        name = personal.get('name', 'Curriculum Vitae')
        title = doc.add_heading(name, 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Contact info
        contact = []
        if personal.get('email'):
            contact.append(f"Email: {personal.get('email')}")
        if personal.get('phone'):
            contact.append(f"Phone: {personal.get('phone')}")
        if personal.get('location'):
            contact.append(f"Location: {personal.get('location')}")

        if contact:
            contact_para = doc.add_paragraph(' | '.join(contact))
            contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in contact_para.runs:
                run.font.size = Pt(10)
                run.font.color.rgb = None

        doc.add_paragraph()

        # Summary
        if content.get('summary'):
            doc.add_heading('Professional Summary', level=1)
            doc.add_paragraph(content['summary'])

        # Work Experience
        if content.get('work_experience'):
            doc.add_heading('Work Experience', level=1)
            for exp in content['work_experience']:
                p = doc.add_paragraph()
                p.add_run(f"{exp.get('title', '')}").bold = True
                if exp.get('company'):
                    p.add_run(f" at {exp.get('company')}").bold = True

                if exp.get('dates'):
                    doc.add_paragraph(f"({exp.get('dates')})", style='Intense Quote')

                description = exp.get('description', '')
                # Handle bullet points
                if '•' in description or '- ' in description:
                    lines = description.replace('•', '-').split('\n')
                    for line in lines:
                        if line.strip():
                            doc.add_paragraph(line.strip(), style='List Bullet')
                else:
                    doc.add_paragraph(description)

        # Education
        if content.get('education'):
            doc.add_heading('Education', level=1)
            for edu in content['education']:
                p = doc.add_paragraph()
                p.add_run(f"{edu.get('degree', '')}").bold = True
                if edu.get('institution'):
                    p.add_run(f" - {edu.get('institution')}")

                if edu.get('dates'):
                    doc.add_paragraph(f"({edu.get('dates')})", style='Intense Quote')
                if edu.get('grade'):
                    doc.add_paragraph(f"Grade: {edu.get('grade')}")

        # Skills
        if content.get('skills'):
            doc.add_heading('Skills', level=1)
            skills = content['skills']
            if isinstance(skills, list):
                # Create a table for skills
                num_cols = 3
                num_rows = (len(skills) + num_cols - 1) // num_cols
                table = doc.add_table(rows=num_rows, cols=num_cols)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER

                for i, skill in enumerate(skills):
                    row = i // num_cols
                    col = i % num_cols
                    cell = table.cell(row, col)
                    cell.text = f"• {skill}"

                    # Format cell
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            run.font.size = Pt(10)
            elif isinstance(skills, dict):
                for category, skill_list in skills.items():
                    doc.add_paragraph(f"{category}:", style='List Bullet')
                    doc.add_paragraph(", ".join(skill_list))

        # Certifications
        if content.get('certifications'):
            doc.add_heading('Certifications', level=1)
            for cert in content['certifications']:
                doc.add_paragraph(cert, style='List Bullet')

        # Save to bytes
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    def _generate_html(self, cv):
        """Generate HTML version of CV (fallback)"""
        content = cv.content
        personal = content.get('personal_info', {})

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{personal.get('name', 'CV')}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.4;
                    color: #333;
                }}
                h1 {{
                    color: #2563eb;
                    font-size: 28px;
                    margin-bottom: 5px;
                }}
                .contact {{
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 15px;
                }}
                .section {{
                    margin-bottom: 20px;
                }}
                .section-title {{
                    font-size: 18px;
                    font-weight: bold;
                    color: #2563eb;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                }}
                .job {{
                    margin-bottom: 15px;
                }}
                .job-title {{
                    font-weight: bold;
                    font-size: 16px;
                }}
                .company {{
                    color: #666;
                }}
                .date {{
                    color: #999;
                    font-size: 12px;
                    float: right;
                }}
                .skill-badge {{
                    display: inline-block;
                    background: #e5e7eb;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    margin: 3px;
                }}
            </style>
        </head>
        <body>
            <h1>{personal.get('name', 'Your Name')}</h1>
            <div class="contact">
                {personal.get('email', '')} | {personal.get('phone', '')} | {personal.get('location', '')}
            </div>
        """

        # Summary
        if content.get('summary'):
            html += f"""
            <div class="section">
                <div class="section-title">Professional Summary</div>
                <p>{content['summary']}</p>
            </div>
            """

        # Work Experience
        if content.get('work_experience'):
            html += '<div class="section"><div class="section-title">Work Experience</div>'
            for exp in content['work_experience']:
                html += f"""
                <div class="job">
                    <div class="job-title">{exp.get('title', '')}</div>
                    <div class="company">{exp.get('company', '')}</div>
                    <div class="date">{exp.get('dates', '')}</div>
                    <p>{exp.get('description', '')}</p>
                </div>
                """
            html += '</div>'

        # Education
        if content.get('education'):
            html += '<div class="section"><div class="section-title">Education</div>'
            for edu in content['education']:
                html += f"""
                <div>
                    <strong>{edu.get('degree', '')}</strong><br>
                    {edu.get('institution', '')} ({edu.get('dates', '')})
                </div>
                """
            html += '</div>'

        # Skills
        if content.get('skills'):
            html += '<div class="section"><div class="section-title">Skills</div><div>'
            if isinstance(content['skills'], list):
                for skill in content['skills']:
                    html += f'<span class="skill-badge">{skill}</span> '
            elif isinstance(content['skills'], dict):
                for category, skills in content['skills'].items():
                    html += f'<strong>{category}:</strong><br>'
                    for skill in skills:
                        html += f'<span class="skill-badge">{skill}</span> '
                    html += '<br>'
            html += '</div></div>'

        # Certifications
        if content.get('certifications'):
            html += '<div class="section"><div class="section-title">Certifications</div><ul>'
            for cert in content['certifications']:
                html += f'<li>{cert}</li>'
            html += '</ul></div>'

        html += """
        </body>
        </html>
        """

        return html