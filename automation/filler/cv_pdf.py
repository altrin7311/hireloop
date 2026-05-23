"""Tailored CV → single-column PDF (reportlab).

Returns bytes and (optionally) writes to ``/tmp/hireloop_cv_{user_id}.pdf``
so the Selenium filler can upload it as a real file. Single column,
Helvetica, no images — minimises file size and ATS parsing risk.
"""

from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

logger = logging.getLogger("hireloop.filler.cv_pdf")


def _styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "Name",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            spaceAfter=2,
            textColor="#0C1A1C",
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            spaceBefore=10,
            spaceAfter=4,
            textColor="#0C1A1C",
        ),
        "role": ParagraphStyle(
            "Role",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13,
            spaceBefore=4,
            spaceAfter=1,
            textColor="#0C1A1C",
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            leading=12,
            spaceAfter=3,
            textColor="#5A9EA8",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            spaceAfter=4,
            textColor="#0C1A1C",
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            spaceAfter=2,
            textColor="#0C1A1C",
        ),
    }


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    # Minimal HTML escape — reportlab Paragraph parses XML-ish markup.
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _bullet_list(items: List[str], style: ParagraphStyle) -> ListFlowable:
    flow_items = [
        ListItem(Paragraph(_safe_text(item), style), leftIndent=10)
        for item in items
        if str(item).strip()
    ]
    return ListFlowable(
        flow_items,
        bulletType="bullet",
        bulletChar="•",
        leftIndent=14,
        bulletFontSize=8,
        spaceBefore=2,
    )


def _section_header(title: str, styles: Mapping[str, ParagraphStyle]) -> List[Any]:
    return [
        Paragraph(title.upper(), styles["h2"]),
        HRFlowable(width="100%", thickness=0.5, color="#B2EDEC", spaceAfter=4),
    ]


def render_cv_pdf(tailored_cv: Dict[str, Any], display_name: Optional[str] = None) -> bytes:
    """Render a tailored CV dict to PDF bytes."""
    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title="HireLoop CV",
        author=display_name or "HireLoop applicant",
    )

    story: List[Any] = []

    if display_name:
        story.append(Paragraph(_safe_text(display_name), styles["name"]))
        story.append(Spacer(1, 4))

    summary = (tailored_cv.get("summary") or "").strip()
    if summary:
        story.extend(_section_header("Summary", styles))
        story.append(Paragraph(_safe_text(summary), styles["body"]))

    experience = tailored_cv.get("experience") or []
    if isinstance(experience, list) and experience:
        story.extend(_section_header("Experience", styles))
        for role in experience:
            if not isinstance(role, dict):
                continue
            title = role.get("title") or ""
            company = role.get("company") or ""
            dates = role.get("dates") or ""
            header_line = " — ".join(p for p in [title, company] if p)
            story.append(Paragraph(_safe_text(header_line), styles["role"]))
            if dates:
                story.append(Paragraph(_safe_text(dates), styles["meta"]))
            bullets = [b for b in (role.get("bullets") or []) if str(b).strip()]
            if bullets:
                story.append(_bullet_list(bullets, styles["bullet"]))

    skills = tailored_cv.get("skills") or {}
    if isinstance(skills, dict):
        featured = [s for s in (skills.get("featured") or []) if str(s).strip()]
        additional = [s for s in (skills.get("additional") or []) if str(s).strip()]
        if featured or additional:
            story.extend(_section_header("Skills", styles))
            if featured:
                story.append(
                    Paragraph(
                        f"<b>Featured:</b> {_safe_text(', '.join(featured))}",
                        styles["body"],
                    )
                )
            if additional:
                story.append(
                    Paragraph(
                        f"<b>Additional:</b> {_safe_text(', '.join(additional))}",
                        styles["body"],
                    )
                )

    projects = tailored_cv.get("projects") or []
    if isinstance(projects, list) and projects:
        story.extend(_section_header("Projects", styles))
        for project in projects:
            if not isinstance(project, dict):
                continue
            name = project.get("name") or ""
            description = project.get("description") or ""
            technologies = [t for t in (project.get("technologies") or []) if str(t).strip()]
            if name:
                story.append(Paragraph(_safe_text(name), styles["role"]))
            if description:
                story.append(Paragraph(_safe_text(description), styles["body"]))
            if technologies:
                story.append(
                    Paragraph(
                        f"<i>{_safe_text(', '.join(technologies))}</i>",
                        styles["meta"],
                    )
                )

    if not story:
        story.append(Paragraph("Empty CV", styles["body"]))

    doc.build(story)
    return buf.getvalue()


def write_cv_pdf(tailored_cv: Dict[str, Any], user_id: str, display_name: Optional[str] = None) -> Path:
    """Render and persist the CV PDF to ``/tmp/hireloop_cv_{user_id}.pdf``."""
    safe_id = "".join(c for c in (user_id or "anon") if c.isalnum() or c in "-_") or "anon"
    out = Path("/tmp") / f"hireloop_cv_{safe_id}.pdf"
    data = render_cv_pdf(tailored_cv, display_name=display_name)
    out.write_bytes(data)
    logger.info("cv_pdf: wrote %s (%d bytes)", out, len(data))
    return out
