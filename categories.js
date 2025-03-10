document.addEventListener('DOMContentLoaded', () => {
  // Kategorie hinzufügen: Neues Input-Feld ohne placeholder (Labels übernehmen die Anzeige)
  document.getElementById('add-category').addEventListener('click', () => {
    const container = document.getElementById('categories-container');
    const div = document.createElement('div');
    div.className = 'input-field';
    div.innerHTML = '<input class="category-input" type="text"><label>Weitere Kategorie hinzufügen</label>';
    container.appendChild(div);
  });
  
  // Kategorie entfernen: Entfernt den letzten Eintrag, falls mehr als ein Feld vorhanden ist
  document.getElementById('remove-category').addEventListener('click', () => {
    const container = document.getElementById('categories-container');
    const fields = container.querySelectorAll('.input-field');
    if (fields.length > 1) {
      fields[fields.length - 1].remove();
    }
  });
  
  // Weiter-Button: Speichert Playlist-URL und Kategorien in localStorage und leitet zu categorie2.html weiter
  document.getElementById('next-button').addEventListener('click', () => {
    const playlistUrl = document.getElementById('playlist-url').value.trim();
    if (!playlistUrl) {
      M.toast({ html: "Bitte Playlist URL eingeben", classes: "rounded", displayLength: 2000 });
      return;
    }
    localStorage.setItem('mobilePlaylistUrl', playlistUrl);
    
    const catInputs = document.querySelectorAll('.category-input');
    let categories = [];
    catInputs.forEach(input => {
      const value = input.value.trim();
      if (value) categories.push(value);
    });
    // Kategorien sind optional – wenn leer, speichern wir einen leeren Array
    localStorage.setItem('mobileCategories', JSON.stringify(categories));
    
    window.location.href = 'categories2.html';
  });
  
  // Anleitung2 Overlay-Logik
  const anleitung2Btn = document.getElementById('anleitung2-button');
  const anleitung2Overlay = document.getElementById('anleitung2-overlay');
  const closeAnleitung2Btn = document.getElementById('close-anleitung2');
  
  anleitung2Btn.addEventListener('click', () => {
    anleitung2Overlay.style.display = 'flex';
  });
  
  closeAnleitung2Btn.addEventListener('click', () => {
    anleitung2Overlay.style.display = 'none';
  });
});