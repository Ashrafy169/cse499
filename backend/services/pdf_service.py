from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas as rl_canvas

PRIMARY = colors.HexColor("#C41230")
BLACK = colors.HexColor("#1e1e1e")
GRAY = colors.HexColor("#64748b")
LIGHT_GRAY = colors.HexColor("#f1f5f9")
WHITE = colors.white

W, H = A4


def _draw_rect(c: rl_canvas.Canvas, x, y, w, h, fill_color, stroke=False):
    c.setFillColor(fill_color)
    c.rect(x, y, w, h, fill=True, stroke=stroke)


def _text(c: rl_canvas.Canvas, x, y, text, font="Helvetica", size=10, color=BLACK):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, str(text))


def _right_text(c: rl_canvas.Canvas, x, y, text, font="Helvetica", size=10, color=BLACK):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawRightString(x, y, str(text))


def generate_invoice_pdf(invoice, customer, plan) -> bytes:
    buffer = BytesIO()
    c = rl_canvas.Canvas(buffer, pagesize=A4)

    # ── Header bar ──────────────────────────────────────────────────────────
    _draw_rect(c, 0, H - 90, W, 90, PRIMARY)
    _text(c, 2 * cm, H - 38, "AmberIT", "Helvetica-Bold", 26, WHITE)
    _text(c, 2 * cm, H - 56, "Broadband Internet Service Provider", size=10, color=WHITE)

    _right_text(c, W - 2 * cm, H - 35, "INVOICE", "Helvetica-Bold", 22, WHITE)
    _right_text(c, W - 2 * cm, H - 54, f"#{str(invoice.id)[:8].upper()}", size=9, color=WHITE)

    # ── Invoice + Customer columns ──────────────────────────────────────────
    col_y = H - 105
    left_x = 2 * cm
    right_x = W / 2 + 1 * cm

    # Left: invoice meta
    _text(c, left_x, col_y, "INVOICE DETAILS", "Helvetica-Bold", 9, GRAY)
    rows_l = [
        ("Billing Month:", _month_label(invoice.billing_month)),
        ("Issue Date:", _fmt_date(invoice.created_at)),
        ("Due Date:", _fmt_date(invoice.due_date)),
        ("Status:", invoice.status.upper()),
    ]
    _detail_rows(c, left_x, col_y - 16, rows_l)

    # Right: customer info
    _text(c, right_x, col_y, "BILLED TO", "Helvetica-Bold", 9, GRAY)
    rows_r = [
        ("Name:", customer.full_name),
        ("Email:", customer.email),
        ("Phone:", customer.phone),
    ]
    if customer.address:
        rows_r.append(("Address:", customer.address))
    _detail_rows(c, right_x, col_y - 16, rows_r)

    # ── Separator ───────────────────────────────────────────────────────────
    sep_y = col_y - 16 - len(max(rows_l, rows_r, key=len)) * 18 - 12
    _draw_rect(c, 2 * cm, sep_y, W - 4 * cm, 1, LIGHT_GRAY)

    # ── Plan table ──────────────────────────────────────────────────────────
    tbl_y = sep_y - 20
    _draw_rect(c, 2 * cm, tbl_y - 2, W - 4 * cm, 22, LIGHT_GRAY)
    _text(c, 2.3 * cm, tbl_y + 7, "Plan", "Helvetica-Bold", 9, BLACK)
    _text(c, 9 * cm, tbl_y + 7, "Speed", "Helvetica-Bold", 9, BLACK)
    _right_text(c, W - 2.3 * cm, tbl_y + 7, "Amount", "Helvetica-Bold", 9, BLACK)

    row_y = tbl_y - 22
    plan_name = plan.name if plan else "N/A"
    plan_speed = f"{plan.speed_mbps} Mbps" if plan else "-"
    amount_str = f"BDT {Decimal(str(invoice.amount)):,.2f}"
    _text(c, 2.3 * cm, row_y + 7, plan_name, size=10)
    _text(c, 9 * cm, row_y + 7, plan_speed, size=10)
    _right_text(c, W - 2.3 * cm, row_y + 7, amount_str, size=10)

    # ── Total ───────────────────────────────────────────────────────────────
    tot_y = row_y - 30
    _draw_rect(c, 2 * cm, tot_y, W - 4 * cm, 1, LIGHT_GRAY)
    tot_label_y = tot_y - 25
    _right_text(c, W - 2.3 * cm - 7 * cm, tot_label_y + 4, "TOTAL DUE:", "Helvetica-Bold", 12, GRAY)
    _right_text(c, W - 2.3 * cm, tot_label_y + 4, amount_str, "Helvetica-Bold", 16, PRIMARY)

    # Status badge
    status = invoice.status
    badge_color = {
        "paid": colors.HexColor("#16a34a"),
        "unpaid": colors.HexColor("#d97706"),
        "overdue": colors.HexColor("#dc2626"),
    }.get(status, GRAY)
    badge_x = 2 * cm
    badge_y = tot_label_y - 5
    badge_w = 70
    _draw_rect(c, badge_x, badge_y, badge_w, 18, badge_color)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(WHITE)
    c.drawCentredString(badge_x + badge_w / 2, badge_y + 5, status.upper())

    # ── Footer ──────────────────────────────────────────────────────────────
    footer_y = 1.5 * cm
    _draw_rect(c, 0, 0, W, footer_y + 10, LIGHT_GRAY)
    _text(c, 2 * cm, footer_y, "AmberIT | support@amberit.com | amberit.com.bd", size=8, color=GRAY)
    _right_text(c, W - 2 * cm, footer_y, "Thank you for your business!", size=8, color=GRAY)

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def _detail_rows(c, x, start_y, rows):
    for i, (label, value) in enumerate(rows):
        y = start_y - i * 18
        _text(c, x, y, label, "Helvetica-Bold", 9, GRAY)
        _text(c, x + 3.5 * cm, y, str(value), size=9)


def _fmt_date(d) -> str:
    if isinstance(d, date):
        return d.strftime("%b %d, %Y")
    try:
        return d.strftime("%b %d, %Y")
    except Exception:
        return str(d)


def _month_label(billing_month: str) -> str:
    try:
        year, month = billing_month.split("-")
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return f"{months[int(month) - 1]} {year}"
    except Exception:
        return billing_month
