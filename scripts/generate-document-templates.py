from pathlib import Path
import shutil

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
PUBLIC = ROOT / "public" / "documents"
LOGO = ROOT / "public" / "masterpress-logo-dark.png"

NAVY = colors.HexColor("#002855")
BLUE = colors.HexColor("#236AA2")
TEXT = colors.HexColor("#173044")
MUTED = colors.HexColor("#647887")
LINE = colors.HexColor("#AEBCC6")
PALE = colors.HexColor("#EEF4F7")
WARNING = colors.HexColor("#A85D0A")


def setup_fonts():
    regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    pdfmetrics.registerFont(TTFont("MP", regular))
    pdfmetrics.registerFont(TTFont("MP-Bold", bold))


def header(c, width, height, title, subtitle, code):
    c.setFillColor(NAVY)
    c.rect(0, height - 64, width, 64, fill=1, stroke=0)
    if LOGO.exists():
        c.drawImage(
            str(LOGO), 26, height - 48, width=130, height=28,
            preserveAspectRatio=True, anchor="sw", mask="auto",
        )
    c.setFillColor(colors.white)
    c.setFont("MP-Bold", 15)
    c.drawString(178, height - 29, title)
    c.setFont("MP", 7.5)
    c.drawString(178, height - 44, subtitle)
    c.setFillColor(colors.HexColor("#D9EDF7"))
    c.roundRect(width - 94, height - 47, 65, 24, 6, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("MP-Bold", 9)
    c.drawCentredString(width - 61.5, height - 38, code)
    c.setFillColor(WARNING)
    c.setFont("MP-Bold", 6.5)
    c.drawCentredString(width - 61.5, height - 45, "WZÓR ROBOCZY")


def wrapped(c, text, x, y, max_width, font="MP", size=7, leading=9):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def field_box(c, x, y_top, width, height, number, label, hint=""):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.65)
    c.rect(x, y_top - height, width, height, fill=0, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("MP-Bold", 6.4)
    c.drawString(x + 5, y_top - 10, f"{number}. {label}")
    if hint:
        c.setFillColor(MUTED)
        wrapped(c, hint, x + 5, y_top - 20, width - 10, size=5.8, leading=7)


def footer(c, width, text):
    c.setStrokeColor(LINE)
    c.line(26, 24, width - 26, 24)
    c.setFillColor(MUTED)
    c.setFont("MP", 5.8)
    c.drawString(26, 14, "Warehouse Masterpress")
    c.drawRightString(width - 26, 14, text)


def generate_cmr(path):
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle("Warehouse Masterpress - wzór CMR")
    header(
        c, width, height,
        "Międzynarodowy samochodowy list przewozowy",
        "Convention relative au contrat de transport international de marchandises par route",
        "CMR",
    )

    margin = 26
    gap = 5
    body_width = width - 2 * margin
    left_width = (body_width - gap) * 0.54
    right_width = body_width - gap - left_width
    right_x = margin + left_width + gap
    y = height - 72

    field_box(c, margin, y, left_width, 68, "1", "Nadawca", "Nazwa, adres, kraj")
    field_box(c, right_x, y, right_width, 68, "16", "Przewoźnik", "Nazwa, adres, kraj")
    y -= 68 + gap
    field_box(c, margin, y, left_width, 60, "2", "Odbiorca", "Nazwa, adres, kraj")
    field_box(c, right_x, y, right_width, 60, "17", "Kolejni przewoźnicy", "Nazwa, adres, kraj")
    y -= 60 + gap
    field_box(c, margin, y, left_width, 42, "3", "Miejsce przeznaczenia", "Miejscowość, kraj")
    field_box(c, margin, y - 42, left_width, 42, "4", "Miejsce i data przyjęcia towaru", "Miejscowość, data")
    field_box(c, right_x, y, right_width, 84, "18", "Zastrzeżenia i uwagi przewoźnika")
    y -= 84 + gap
    field_box(c, margin, y, body_width, 38, "5", "Załączone dokumenty")
    y -= 38 + gap

    columns = [58, 48, 56, 135, 62, 62, body_width - 421]
    labels = [
        "6. Znaki i numery", "7. Liczba sztuk", "8. Rodzaj opakowania",
        "9. Nazwa towaru", "10. Nr statystyczny", "11. Masa brutto", "12. Objętość",
    ]
    c.setStrokeColor(LINE)
    c.setFillColor(PALE)
    c.rect(margin, y - 27, body_width, 27, fill=1, stroke=1)
    x = margin
    for index, (column_width, label) in enumerate(zip(columns, labels)):
        if index:
            c.line(x, y, x, y - 119)
        c.setFillColor(TEXT)
        wrapped(c, label, x + 3, y - 9, column_width - 6, font="MP-Bold", size=5.2, leading=6)
        x += column_width
    for row in range(1, 5):
        c.line(margin, y - 27 - row * 23, margin + body_width, y - 27 - row * 23)
    c.rect(margin, y - 119, body_width, 119, fill=0, stroke=1)
    y -= 119 + gap

    field_box(c, margin, y, left_width, 61, "13", "Instrukcje nadawcy")
    field_box(c, right_x, y, right_width, 61, "19", "Postanowienia specjalne")
    y -= 61 + gap

    charge_labels = ["Rodzaj kosztu", "Nadawca", "Waluta", "Odbiorca"]
    charge_widths = [body_width * 0.48, body_width * 0.18, body_width * 0.14, body_width * 0.20]
    c.setFillColor(PALE)
    c.rect(margin, y - 22, body_width, 22, fill=1, stroke=1)
    x = margin
    for index, (column_width, label) in enumerate(zip(charge_widths, charge_labels)):
        if index:
            c.line(x, y, x, y - 82)
        c.setFillColor(TEXT)
        c.setFont("MP-Bold", 5.7)
        c.drawString(x + 4, y - 14, label)
        x += column_width
    for row in range(1, 4):
        c.line(margin, y - 22 - row * 20, margin + body_width, y - 22 - row * 20)
    c.rect(margin, y - 82, body_width, 82, fill=0, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("MP-Bold", 6.2)
    c.drawString(margin + 4, y - 92, "20. Koszty przewozu")
    y -= 101

    signature_width = (body_width - 2 * gap) / 3
    field_box(c, margin, y, signature_width, 68, "22", "Podpis i pieczęć nadawcy")
    field_box(c, margin + signature_width + gap, y, signature_width, 68, "23", "Podpis i pieczęć przewoźnika")
    field_box(c, margin + 2 * (signature_width + gap), y, signature_width, 68, "24", "Potwierdzenie odbioru")
    c.setFillColor(MUTED)
    c.setFont("MP", 5.4)
    c.drawString(margin, y - 78, "21. Wystawiono w: ____________________    dnia: ____________________")
    footer(c, width, "Wzór roboczy CMR - do weryfikacji przed użyciem")
    c.save()


def generate_wz(path):
    width, height = landscape(A4)
    c = canvas.Canvas(str(path), pagesize=landscape(A4))
    c.setTitle("Warehouse Masterpress - wzór WZ")
    header(
        c, width, height,
        "Dokument wydania zewnętrznego",
        "Formularz magazynowy do uzupełnienia i wydruku",
        "WZ",
    )
    margin = 28
    body_width = width - 2 * margin
    y = height - 75

    meta = [
        ("Numer dokumentu WZ", 0.25),
        ("Data wydania", 0.18),
        ("Numer zamówienia / ładunku", 0.30),
        ("Magazyn", 0.27),
    ]
    x = margin
    for label, fraction in meta:
        cell_width = body_width * fraction
        field_box(c, x, y, cell_width, 45, "", label)
        x += cell_width
    y -= 51
    field_box(c, margin, y, body_width * 0.5 - 3, 62, "", "Odbiorca", "Nazwa, adres, NIP")
    field_box(c, margin + body_width * 0.5 + 3, y, body_width * 0.5 - 3, 62, "", "Miejsce dostawy", "Nazwa obiektu, adres")
    y -= 69

    widths = [35, 95, 190, 90, 58, 48, 115, body_width - 631]
    headers = ["Lp.", "Indeks", "Nazwa wyrobu", "Partia", "Ilość", "J.m.", "Paleta / NI", "Uwagi"]
    header_height = 26
    row_height = 26
    rows = 8
    c.setFillColor(NAVY)
    c.rect(margin, y - header_height, body_width, header_height, fill=1, stroke=1)
    x = margin
    for index, (cell_width, label) in enumerate(zip(widths, headers)):
        if index:
            c.setStrokeColor(colors.white)
            c.line(x, y, x, y - header_height)
        c.setFillColor(colors.white)
        c.setFont("MP-Bold", 6.5)
        c.drawCentredString(x + cell_width / 2, y - 17, label)
        x += cell_width
    table_bottom = y - header_height - rows * row_height
    c.setStrokeColor(LINE)
    c.rect(margin, table_bottom, body_width, header_height + rows * row_height, fill=0, stroke=1)
    x = margin
    for index, cell_width in enumerate(widths):
        if index:
            c.line(x, y - header_height, x, table_bottom)
        x += cell_width
    for row in range(rows + 1):
        row_y = y - header_height - row * row_height
        c.line(margin, row_y, margin + body_width, row_y)
        if row < rows:
            c.setFillColor(MUTED)
            c.setFont("MP", 6)
            c.drawCentredString(margin + widths[0] / 2, row_y - 17, str(row + 1))
    y = table_bottom - 10

    note_width = body_width * 0.54
    field_box(c, margin, y, note_width, 66, "", "Uwagi do wydania")
    signature_x = margin + note_width + 6
    signature_width = (body_width - note_width - 12) / 2
    field_box(c, signature_x, y, signature_width, 66, "", "Wydał", "Data, podpis")
    field_box(c, signature_x + signature_width + 6, y, signature_width, 66, "", "Odebrał", "Data, podpis")
    footer(c, width, "Wzór roboczy WZ - do weryfikacji przed użyciem")
    c.save()


def main():
    setup_fonts()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    cmr = OUTPUT / "Warehouse-Masterpress-wzor-CMR.pdf"
    wz = OUTPUT / "Warehouse-Masterpress-wzor-WZ.pdf"
    generate_cmr(cmr)
    generate_wz(wz)
    shutil.copy2(cmr, PUBLIC / cmr.name)
    shutil.copy2(wz, PUBLIC / wz.name)
    print(cmr)
    print(wz)


if __name__ == "__main__":
    main()
