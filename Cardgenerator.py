import os
import math
import random
import re
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

# =========================================
# Einstellungen: Kartengröße und PDF-Layout
# =========================================

# Zielkartengröße: 6,5 cm x 6,5 cm
card_size_cm = 6.5
card_size_inch = card_size_cm / 2.54
card_size_points = card_size_inch * 72  # ca. 184 Punkte
# Für Bildgenerierung (300 DPI)
DPI = 300
card_size_px = int(card_size_inch * DPI)  # ca. 768 Pixel

# A4-Seitengröße in Punkten
page_width, page_height = A4  # ca. 595 x 842 Punkte

# Berechne, wie viele Karten reinpassen
cols = int(page_width // card_size_points)
rows = int(page_height // card_size_points)
cards_per_page = cols * rows

# Berechne den horizontalen und vertikalen Abstand (Spacing)
horizontal_spacing = (page_width - (cols * card_size_points)) / (cols + 1)
vertical_spacing = (page_height - (rows * card_size_points)) / (rows + 1)

print(f"Layout: {cols} Spalten x {rows} Reihen = {cards_per_page} Karten pro Seite")
print(f"Horizontaler Abstand: {horizontal_spacing:.1f} Punkte, Vertikaler Abstand: {vertical_spacing:.1f} Punkte")

# =========================================
# Spotify API Konfiguration
# =========================================

client_id = "300cc60adb094a0f848e639c6630e34e"
client_secret = "9550628ca28340cb9e672c4ad9347b19"
client_credentials_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

def get_playlist_id(playlist_url):
    parts = playlist_url.split("/")
    return parts[-1].split("?")[0]

# =========================================
# Playlist abrufen und Song-Daten extrahieren
# =========================================

playlist_url = input("Bitte den Spotify-Playlist-Link eingeben: ")
playlist_id = get_playlist_id(playlist_url)

tracks = []
offset = 0
while True:
    response = sp.playlist_items(playlist_id, offset=offset, market="DE")
    tracks.extend(response['items'])
    if response['next'] is None:
        break
    offset += len(response['items'])

song_data = []
for item in tracks:
    track = item['track']
    if track is None:
        continue
    title = track.get('name', 'Unbekannt')
    # Entferne alles ab (und inkl.) dem ersten Bindestrich
    if "-" in title:
        title = re.sub(r"\s*-\s*.*", "", title)
    artists = ", ".join([artist.get('name', 'Unbekannt') for artist in track.get('artists', [])])
    release_date = track.get('album', {}).get('release_date', '0000')
    year = release_date.split("-")[0]
    spotify_link = track.get('external_urls', {}).get('spotify', '')
    added_by = item.get('added_by', {}).get('id', 'Unbekannt')
    song_data.append({
        "Titel": title,
        "Interpret": artists,
        "Jahr": year,
        "Spotify-Link": spotify_link,
        "AddedBy": added_by
    })

print(f"{len(song_data)} Songs aus der Playlist geladen.")

# =========================================
# Hilfsfunktionen: Textumbruch und Farbverläufe
# =========================================

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines

def create_gradient_background_vertical(width, height, color_top, color_bottom):
    """Erstellt einen vertikalen Farbverlauf von color_top nach color_bottom."""
    base = Image.new('RGB', (width, height))
    for y in range(height):
        t = y / height
        r = int(color_top[0] + t * (color_bottom[0] - color_top[0]))
        g = int(color_top[1] + t * (color_bottom[1] - color_top[1]))
        b = int(color_top[2] + t * (color_bottom[2] - color_top[2]))
        for x in range(width):
            base.putpixel((x, y), (r, g, b))
    return base

def generate_light_gradient_background(width, height):
    """Generiert einen individuellen Farbverlauf mit zufälligen, hellen Farben."""
    color_top = (
        random.randint(200, 255),
        random.randint(200, 255),
        random.randint(200, 255)
    )
    color_bottom = (
        random.randint(170, 240),
        random.randint(170, 240),
        random.randint(170, 240)
    )
    return create_gradient_background_vertical(width, height, color_top, color_bottom)

# Neue Hilfsfunktion: Zeichnet einen mehrzeiligen Textblock so, dass dessen vertikale Mitte auf center_y liegt.
def draw_multiline_block_center_at_y(draw, lines, font, center_y, card_width, line_spacing=10):
    if not lines:
        return
    # Berechne Gesamthöhe des Blocks
    total_height = 0
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        h = bbox[3] - bbox[1]
        line_heights.append(h)
        total_height += h
    total_height += line_spacing * (len(lines) - 1)
    start_y = center_y - total_height / 2
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_width = bbox[2] - bbox[0]
        x = (card_width - line_width) / 2
        draw.text((x, round(start_y)), line, font=font, fill="black")
        start_y += line_heights[i] + line_spacing

# =========================================
# Funktionen zur Kartenerstellung
# =========================================

def generate_qr(spotify_url, qr_size):
    qr = qrcode.make(spotify_url)
    return qr.resize((qr_size, qr_size))

def create_front_card(spotify_url):
    """
    Gestaltet die Vorderseite:
      - Schwarzer Hintergrund.
      - 8 konzentrische Ringe in den vorgegebenen Farben, mit einer 60°-Lücke,
        wobei der Startwinkel für jeden Ring zufällig gewählt wird.
      - Ringe haben eine Dicke von 7px, Offset = 20 + i*30.
      - Der QR-Code wird in einem Bereich von 50% der Kartengröße zentriert eingefügt (ohne weiße Box).
      - Oben links erscheint "Für Julian" in kleinen weißen Buchstaben.
      - Abschließend wird ein weißer Rahmen gezeichnet.
    """
    card = Image.new("RGB", (card_size_px, card_size_px), "black")
    draw = ImageDraw.Draw(card)
    
    ring_colors = ["#CD2990", "#00BFFF", "#FFFF00", "#CD2990", "#7D26CD", "#FFA500", "#00BFFF", "#FFFF00"]
    ring_thickness = 7
    num_rings = 8
    for i in range(num_rings):
        offset = 20 + i * 30
        start_angle = random.uniform(0, 360)
        end_angle = start_angle + 300  # 360 - 60 = 300°
        draw.arc([(offset, offset), (card_size_px - offset, card_size_px - offset)],
                 start=start_angle, end=end_angle, fill=ring_colors[i], width=ring_thickness)
    
    # QR-Code: Größe 50% der Karte
    qr_size = int(card_size_px * 0.5)
    qr_x = (card_size_px - qr_size) // 2
    qr_y = (card_size_px - qr_size) // 2
    qr_img = generate_qr(spotify_url, qr_size)
    card.paste(qr_img, (qr_x, qr_y))
    
    # Text "Für Julian" oben links
    try:
        font_small = ImageFont.truetype("arial.ttf", 20)
    except:
        font_small = ImageFont.load_default()
    draw.text((10, 10), "Für Julian", font=font_small, fill="white")
    
    # Weißer Rahmen um die Karte
    draw.rectangle([(0, 0), (card_size_px - 1, card_size_px - 1)], outline="white", width=2)
    
    return card

def create_back_card(title, artist, year, added_by):
    """
    Gestaltet die Rückseite mit drei getrennten Bereichen:
      • Oben: Song-Block ("Song: {title}") – Der gesamte Block wird so gezeichnet, dass dessen vertikale Mitte bei top_margin liegt.
      • Mitte: Jahr-Block (nur die Jahreszahl in 80pt Bold) – exakt in der Kartenmitte.
      • Unten: Künstler-Block ("Künstler: {artist}") – Der gesamte Block wird so gezeichnet, dass dessen vertikale Mitte bei (card_size_px - bottom_margin) liegt.
    Zusätzlich wird "Hinzugefügt von: {added_by}" in 20pt rechts unten mit 20px Abstand gezeichnet.
    Hintergrund: Jeder Kartenrückseite wird ein individueller, zufälliger, heller vertikaler Farbverlauf zugewiesen.
    """
    card = generate_light_gradient_background(card_size_px, card_size_px)
    draw = ImageDraw.Draw(card)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 56)
        font_year  = ImageFont.truetype("arialbd.ttf", 120)
        font_info  = ImageFont.truetype("ariali.ttf", 48,)
        font_added = ImageFont.truetype("arial.ttf", 20)
    except:
        font_title = ImageFont.load_default()
        font_year  = ImageFont.load_default()
        font_info  = ImageFont.load_default()
        font_added = ImageFont.load_default()
    
    text_song = f"{artist}"
    text_year = f"{year}"
    text_artist = f"{title}"
    text_added = f"Hinzugefügt von: {added_by}"
    
    max_width = card_size_px - 40  # 20px Rand links und rechts
    line_spacing = 10
    
    top_margin = 160
    bottom_margin = 160
    
    # Erhalte die Zeilen für die beiden Blöcke
    song_lines = wrap_text(text_song, font_title, max_width, draw)
    artist_lines = wrap_text(text_artist, font_info, max_width, draw)
    year_lines = wrap_text(text_year, font_year, max_width, draw)
    
    # Zeichne Song-Block: Vertikale Mitte des Blocks wird bei top_margin liegen.
    draw_multiline_block_center_at_y(draw, song_lines, font_title, top_margin, card_size_px, line_spacing)
    
    # Zeichne Jahr-Block: Einfach zentriert in der Karte.
    total_year_height = 0
    year_heights = []
    for line in year_lines:
        bbox = draw.textbbox((0,0), line, font=font_year)
        h = bbox[3] - bbox[1]
        year_heights.append(h)
        total_year_height += h
    total_year_height += line_spacing * (len(year_lines) - 1)
    start_y_year = (card_size_px - total_year_height) / 2
    y_temp = start_y_year
    for line in year_lines:
        bbox = draw.textbbox((0,0), line, font=font_year)
        line_width = bbox[2] - bbox[0]
        x = (card_size_px - line_width) / 2
        draw.text((x, round(y_temp)), line, font=font_year, fill="black")
        y_temp += (bbox[3] - bbox[1]) + line_spacing

    # Zeichne Künstler-Block: Vertikale Mitte des Blocks wird bei (card_size_px - bottom_margin) liegen.
    draw_multiline_block_center_at_y(draw, artist_lines, font_info, card_size_px - bottom_margin, card_size_px, line_spacing)
    
    # "Hinzugefügt von: ..." unten rechts
    added_bbox = draw.textbbox((0,0), text_added, font=font_added)
    added_width = added_bbox[2] - added_bbox[0]
    added_height = added_bbox[3] - added_bbox[1]
    x_added = card_size_px - added_width - 20
    y_added = card_size_px - added_height - 20
    draw.text((x_added, y_added), text_added, font=font_added, fill="black")
    
    return card

# =========================================
# Karten für alle Songs generieren
# =========================================

front_images = []
back_images = []

for idx, song in enumerate(song_data):
    front_card = create_front_card(song["Spotify-Link"])
    back_card = create_back_card(song["Titel"], song["Interpret"], song["Jahr"], song["AddedBy"])
    front_path = f"front_{idx}.png"
    back_path = f"back_{idx}.png"
    front_card.save(front_path)
    back_card.save(back_path)
    front_images.append(front_path)
    back_images.append(back_path)

# =========================================
# Funktion: Karten in ein PDF anordnen
# =========================================

def draw_cards_on_page(image_files, c, cols, rows, card_width, card_height, h_spacing, v_spacing, reverse=False):
    for idx, img_file in enumerate(image_files):
        col = idx % cols
        if reverse:
            col = cols - 1 - col
        row = idx // cols
        x = h_spacing + col * (card_width + h_spacing)
        y = page_height - v_spacing - (row + 1) * card_height - row * v_spacing
        c.drawImage(img_file, round(x), round(y), width=round(card_width), height=round(card_height))

# =========================================
# PDF erstellen (Vorder- und Rückseiten)
# =========================================

pdf_filename = "playlist_cards_optimiert2.pdf"
if os.path.exists(pdf_filename):
    os.remove(pdf_filename)

c = canvas.Canvas(pdf_filename, pagesize=A4)
num_batches = math.ceil(len(front_images) / cards_per_page)

for batch in range(num_batches):
    front_batch = front_images[batch * cards_per_page : (batch + 1) * cards_per_page]
    back_batch = back_images[batch * cards_per_page : (batch + 1) * cards_per_page]
    
    draw_cards_on_page(front_batch, c, cols, rows, card_size_points, card_size_points, horizontal_spacing, vertical_spacing)
    c.showPage()
    
    draw_cards_on_page(back_batch, c, cols, rows, card_size_points, card_size_points, horizontal_spacing, vertical_spacing, reverse=True)
    c.showPage()

c.save()
print(f"PDF erstellt: {pdf_filename}")

for file in front_images + back_images:
    os.remove(file)
