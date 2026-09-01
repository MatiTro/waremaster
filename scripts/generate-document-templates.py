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

BLACK = colors.black
MID = colors.HexColor("#696969")
LINE = colors.HexColor("#4A4A4A")
LIGHT_LINE = colors.HexColor("#A5A5A5")
PALE = colors.HexColor("#ECECEC")


def setup_fonts():
    regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    pdfmetrics.registerFont(TTFont("MP", regular))
    pdfmetrics.registerFont(TTFont("MP-Bold", bold))


def numbered_box(
    c,
    x,
    y_top,
    width,
    height,
    number,
    label_pl,
    label_en,
    heavy=False,
):
    c.setStrokeColor(BLACK if heavy else LINE)
    c.setLineWidth(1.15 if heavy else 0.55)
    c.rect(x, y_top - height, width, height, fill=0, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("MP-Bold", 6.8)
    c.drawString(x + 4, y_top - 9, str(number))
    label_x = x + 18
    c.setFont("MP-Bold", 5.7)
    c.drawString(label_x, y_top - 9, label_pl)
    c.setFont("MP", 5.2)
    c.drawString(label_x, y_top - 16, label_en)


def draw_cmr_goods_table(c, x, y_top, width, height):
    proportions = [0.14, 0.11, 0.13, 0.29, 0.12, 0.11, 0.10]
    numbers = [10, 11, 12, 13, 14, 15, ""]
    labels = [
        ("Znaki i numery", "Marks and Nos"),
        ("Liczba sztuk", "No. of packages"),
        ("Rodzaj opak.", "Method of packing"),
        ("Nazwa towaru", "Nature of the goods"),
        ("Masa brutto kg", "Gross weight kg"),
        ("Objętość m³", "Volume m³"),
        ("ADR", "UN / label / group"),
    ]
    header_h = 30
    c.setStrokeColor(BLACK)
    c.setLineWidth(0.65)
    c.rect(x, y_top - height, width, height, fill=0, stroke=1)
    c.setFillColor(PALE)
    c.rect(x, y_top - header_h, width, header_h, fill=1, stroke=1)
    cursor = x
    for index, proportion in enumerate(proportions):
        column_width = width * proportion
        if index:
            c.line(cursor, y_top, cursor, y_top - height)
        c.setFillColor(BLACK)
        if numbers[index] != "":
            c.setFont("MP-Bold", 6.5)
            c.drawString(cursor + 3, y_top - 8, str(numbers[index]))
        c.setFont("MP-Bold", 4.9)
        c.drawCentredString(cursor + column_width / 2, y_top - 17, labels[index][0])
        c.setFont("MP", 4.4)
        c.drawCentredString(cursor + column_width / 2, y_top - 24, labels[index][1])
        cursor += column_width
    row_count = 4
    row_height = (height - header_h) / row_count
    for row in range(1, row_count):
        y = y_top - header_h - row * row_height
        c.setStrokeColor(LIGHT_LINE)
        c.setLineWidth(0.35)
        c.line(x, y, x + width, y)


def draw_charges_box(c, x, y_top, width, height):
    numbered_box(
        c, x, y_top, width, height, 17,
        "Koszty przewozu", "Charges relating to carriage", heavy=True,
    )
    header_y = y_top - 23
    c.setStrokeColor(LINE)
    c.setLineWidth(0.45)
    c.line(x, header_y, x + width, header_y)
    columns = [0.49, 0.255, 0.255]
    labels = ["Rodzaj / Item", "Nadawca / Sender", "Odbiorca / Consignee"]
    cursor = x
    for index, fraction in enumerate(columns):
        column_width = width * fraction
        if index:
            c.line(cursor, header_y, cursor, y_top - height)
        c.setFillColor(BLACK)
        c.setFont("MP-Bold", 4.7)
        c.drawCentredString(cursor + column_width / 2, header_y - 9, labels[index])
        cursor += column_width
    body_top = header_y - 14
    for row in range(1, 4):
        y = body_top - row * ((height - 37) / 4)
        c.setStrokeColor(LIGHT_LINE)
        c.line(x, y, x + width, y)
    c.setFont("MP", 4.7)
    charge_names = [
        "Przewoźne / Carriage", "Dodatkowe / Supplementary",
        "Cło / Customs", "Inne / Other",
    ]
    row_height = (height - 37) / 4
    for index, label in enumerate(charge_names):
        c.drawString(x + 4, body_top - index * row_height - 9, label)


def generate_cmr(path):
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle("CMR - międzynarodowy samochodowy list przewozowy")
    margin = 18
    body_width = width - 2 * margin
    left = body_width * 0.51
    right = body_width - left
    right_x = margin + left
    top = height - 18

    # Bez logo: układ odpowiada rozpoznawalnemu modelowi IRU CMR 2007.
    numbered_box(c, margin, top, left, 71, 1, "Nadawca (nazwa, adres, kraj)", "Sender (name, address, country)")
    c.setStrokeColor(BLACK)
    c.setLineWidth(0.7)
    c.rect(right_x, top - 71, right, 71, fill=0, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("MP-Bold", 21)
    c.drawString(right_x + 8, top - 25, "CMR")
    c.setFont("MP-Bold", 8.2)
    c.drawString(right_x + 73, top - 20, "MIĘDZYNARODOWY LIST PRZEWOZOWY")
    c.setFont("MP", 6)
    c.drawString(right_x + 73, top - 31, "INTERNATIONAL CONSIGNMENT NOTE")
    c.setFont("MP-Bold", 5.7)
    c.drawString(right_x + 8, top - 47, "Nr / No.")
    c.line(right_x + 43, top - 49, right_x + right - 8, top - 49)
    c.setFont("MP", 4.9)
    c.drawString(right_x + 8, top - 61, "Egzemplarz / Copy: ____________________")

    y = top - 71
    numbered_box(c, margin, y, left, 59, 2, "Odbiorca (nazwa, adres, kraj)", "Consignee (name, address, country)")
    numbered_box(c, right_x, y, right, 59, 6, "Przewoźnik (nazwa, adres, kraj)", "Carrier (name, address, country)", heavy=True)
    y -= 59
    numbered_box(c, margin, y, left, 58, 3, "Przyjęcie towaru: miejsce, kraj, data, godzina", "Taking over the goods: place, country, date, time")
    numbered_box(c, right_x, y, right, 58, 7, "Kolejni przewoźnicy", "Successive carriers", heavy=True)
    y -= 58
    numbered_box(c, margin, y, left, 50, 4, "Dostawa towaru: miejsce, kraj, godziny otwarcia", "Delivery: place, country, opening hours")
    numbered_box(c, right_x, y, right, 91, 8, "Zastrzeżenia i uwagi przewoźnika", "Carrier's reservations and observations", heavy=True)
    y -= 50
    numbered_box(c, margin, y, left, 41, 5, "Instrukcje nadawcy", "Sender's instructions")
    y -= 41
    numbered_box(c, margin, y, body_width, 35, 9, "Dokumenty przekazane przewoźnikowi", "Documents handed to the carrier by the sender")
    y -= 35

    draw_cmr_goods_table(c, margin, y, body_width, 124)
    y -= 124

    numbered_box(c, margin, y, left, 63, 16, "Uzgodnienia szczególne", "Special agreements between sender and carrier")
    draw_charges_box(c, right_x, y, right, 118)
    y -= 63
    numbered_box(c, margin, y, left, 55, 18, "Inne użyteczne informacje", "Other useful particulars")
    y -= 55
    numbered_box(c, margin, y, left, 39, 19, "Pobranie", "Cash on delivery")
    y -= 39

    c.setStrokeColor(BLACK)
    c.setLineWidth(0.65)
    c.rect(margin, y - 34, body_width, 34, fill=0, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("MP-Bold", 6.5)
    c.drawString(margin + 4, y - 9, "20")
    c.setFont("MP", 4.8)
    c.drawString(margin + 19, y - 11, "Przewóz podlega postanowieniom Konwencji CMR niezależnie od odmiennej klauzuli.")
    c.drawString(margin + 19, y - 22, "This carriage is subject to the CMR Convention notwithstanding any clause to the contrary.")
    y -= 34

    signature_width = body_width / 4
    numbered_box(c, margin, y, signature_width, 82, 21, "Wystawiono w / dnia", "Established in / on")
    numbered_box(c, margin + signature_width, y, signature_width, 82, 22, "Nadawca", "Signature / stamp of sender")
    numbered_box(c, margin + 2 * signature_width, y, signature_width, 82, 23, "Przewoźnik", "Signature / stamp of carrier", heavy=True)
    numbered_box(c, margin + 3 * signature_width, y, signature_width, 82, 24, "Odbiorca", "Goods received; signature / stamp")
    y -= 82

    c.setStrokeColor(BLACK)
    c.setLineWidth(0.55)
    c.rect(margin, y - 31, body_width, 31, fill=0, stroke=1)
    c.setFont("MP-Bold", 5.3)
    c.drawString(margin + 4, y - 9, "CZĘŚĆ NIEKONTRAKTOWA DLA PRZEWOŹNIKA / NON-CONTRACTUAL PART RESERVED FOR THE CARRIER")
    c.setFont("MP", 4.4)
    c.drawRightString(width - margin, 7, "Układ pól: model IRU CMR 2007")
    c.save()


def simple_field(c, x, y_top, width, height, label, hint=""):
    c.setStrokeColor(BLACK)
    c.setLineWidth(0.55)
    c.rect(x, y_top - height, width, height, fill=0, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("MP-Bold", 6.3)
    c.drawString(x + 5, y_top - 10, label)
    if hint:
        c.setFillColor(MID)
        c.setFont("MP", 5.1)
        c.drawString(x + 5, y_top - 19, hint)


def generate_wz(path):
    width, height = landscape(A4)
    c = canvas.Canvas(str(path), pagesize=landscape(A4))
    c.setTitle("Masterpress - wzór WZ")
    margin = 24
    body_width = width - 2 * margin

    if LOGO.exists():
        c.drawImage(
            str(LOGO), margin, height - 48, width=126, height=30,
            preserveAspectRatio=True, anchor="sw", mask="auto",
        )
    c.setFillColor(BLACK)
    c.setFont("MP-Bold", 17)
    c.drawCentredString(width / 2, height - 28, "DOKUMENT WYDANIA ZEWNĘTRZNEGO")
    c.setFont("MP", 6.5)
    c.drawCentredString(width / 2, height - 40, "WZÓR DO UZUPEŁNIENIA I WYDRUKU")
    c.setLineWidth(1.2)
    c.rect(width - margin - 72, height - 49, 72, 31, fill=0, stroke=1)
    c.setFont("MP-Bold", 15)
    c.drawCentredString(width - margin - 36, height - 38, "WZ")
    c.setLineWidth(0.8)
    c.line(margin, height - 57, width - margin, height - 57)

    y = height - 66
    meta = [
        ("Numer dokumentu WZ", 0.25),
        ("Data wydania", 0.18),
        ("Numer zamówienia / ładunku", 0.31),
        ("Magazyn", 0.26),
    ]
    x = margin
    for label, fraction in meta:
        cell_width = body_width * fraction
        simple_field(c, x, y, cell_width, 39, label)
        x += cell_width
    y -= 46
    simple_field(c, margin, y, body_width * 0.50, 54, "Wydający", "Nazwa, adres, NIP")
    simple_field(c, margin + body_width * 0.50, y, body_width * 0.50, 54, "Odbiorca / miejsce dostawy", "Nazwa, adres, NIP")
    y -= 61

    widths = [34, 88, 201, 83, 53, 42, 119, body_width - 620]
    headers = ["Lp.", "Indeks", "Nazwa wyrobu", "Partia", "Ilość", "J.m.", "Paleta / NI", "Uwagi"]
    header_height = 25
    row_height = 25
    rows = 11
    c.setFillColor(PALE)
    c.setStrokeColor(BLACK)
    c.setLineWidth(0.65)
    c.rect(margin, y - header_height, body_width, header_height, fill=1, stroke=1)
    x = margin
    for index, (cell_width, label) in enumerate(zip(widths, headers)):
        if index:
            c.line(x, y, x, y - header_height - rows * row_height)
        c.setFillColor(BLACK)
        c.setFont("MP-Bold", 6.1)
        c.drawCentredString(x + cell_width / 2, y - 16, label)
        x += cell_width
    table_bottom = y - header_height - rows * row_height
    c.rect(margin, table_bottom, body_width, header_height + rows * row_height, fill=0, stroke=1)
    for row in range(rows + 1):
        row_y = y - header_height - row * row_height
        c.setStrokeColor(LIGHT_LINE if row else BLACK)
        c.setLineWidth(0.4 if row else 0.65)
        c.line(margin, row_y, margin + body_width, row_y)
        if row < rows:
            c.setFillColor(MID)
            c.setFont("MP", 5.5)
            c.drawCentredString(margin + widths[0] / 2, row_y - 16, str(row + 1))
    y = table_bottom - 8

    note_width = body_width * 0.54
    simple_field(c, margin, y, note_width, 62, "Uwagi do wydania")
    signature_x = margin + note_width
    signature_width = (body_width - note_width) / 2
    simple_field(c, signature_x, y, signature_width, 62, "Wydał", "Data i podpis")
    simple_field(c, signature_x + signature_width, y, signature_width, 62, "Odebrał", "Data i podpis")
    c.setFillColor(MID)
    c.setFont("MP", 5)
    c.drawString(margin, 10, "Wzór roboczy - przed użyciem zatwierdzić zgodność z obowiązującym obiegiem dokumentów.")
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
