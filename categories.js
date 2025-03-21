document.addEventListener('DOMContentLoaded', () => {
  // Kategorie hinzufügen: Neues Input-Feld ohne placeholder (Labels übernehmen die Anzeige)
  document.getElementById('add-category').addEventListener('click', () => {
    const container = document.getElementById('categories-container');
    const div = document.createElement('div');
    div.className = 'input-field';
    div.innerHTML = '<input class="category-input" type="text"><label>Weitere Kategorie hinzufügen</label>';
    container.appendChild(div);

    // Fokus auf das neu hinzugefügte Eingabefeld setzen
    div.querySelector('.category-input').focus();
  });

  // Kategorie entfernen: Entfernt den letzten Eintrag, falls mehr als ein Feld vorhanden ist
  document.getElementById('remove-category').addEventListener('click', () => {
    const container = document.getElementById('categories-container');
    const fields = container.querySelectorAll('.input-field');
    if (fields.length > 1) {
      fields[fields.length - 1].remove();
    }
  });

  // Weiter-Button: Speichert Playlist-URL und Kategorien in localStorage und leitet zu categories2.html weiter
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

  // Mitspieler hinzufügen
  document.getElementById('add-player').addEventListener('click', () => {
    const container = document.getElementById('players-container');
    const div = document.createElement('div');
    div.className = 'input-field';
    div.innerHTML = '<input class="player-input" type="text"><label>Wer spielt noch mit?</label>';
    container.appendChild(div);

    // Fokus auf das neu hinzugefügte Eingabefeld setzen
  });

  // Mitspieler entfernen: Entfernt den letzten Eintrag, falls mehr als ein Feld vorhanden ist
  document.getElementById('remove-player').addEventListener('click', () => {
    const container = document.getElementById('players-container');
    const fields = container.querySelectorAll('.input-field');
    if (fields.length > 1) {
      fields[fields.length - 1].remove();
    }
  });

  // Bestätigen-Button: Speichern der Mitspieler und Gewinnpunkte, dann Weiterleitung zu mobil.html
  document.getElementById('confirm-button').addEventListener('click', () => {
    const playerInputs = document.querySelectorAll('.player-input');
    let players = [];
    playerInputs.forEach(input => {
      const value = input.value.trim();
      if (value) players.push(value);
    });
    if (players.length === 0) {
      M.toast({ html: "Bitte mindestens einen Mitspieler eingeben", classes: "rounded", displayLength: 2000 });
      return;
    }
    localStorage.setItem('mobilePlayers', JSON.stringify(players));

    const winningScoreInput = document.getElementById('winning-score').value.trim();
    const winningScore = parseInt(winningScoreInput, 10);
    if (isNaN(winningScore) || winningScore < 1) {
      M.toast({ html: "Bitte gültige Gewinnpunkte (mind. 1) eingeben", classes: "rounded", displayLength: 2000 });
      return;
    }
    localStorage.setItem('winningScore', winningScore.toString());

    // Initialisiere den aktuellen Spieler-Index und Scores
    localStorage.setItem('currentPlayerIndex', "0");
    let playerScores = new Array(players.length).fill(0);
    localStorage.setItem('playerScores', JSON.stringify(playerScores));

    console.log("Gespeicherte Mitspieler:", localStorage.getItem('mobilePlayers'));
    console.log("Gewinnpunkte:", localStorage.getItem('winningScore'));
    window.location.href = 'mobil.html';
  });
});
