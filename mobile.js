// Globale Variablen
let cachedPlaylistTracks = null;
let selectedTrackUri = null;
let mobileCategories = [];
let mobilePlayers = [];
let currentPlayerIndex = 0;
let playerScores = [];
let firstRound = true; // Beim allerersten Song bleibt Spieler 1 aktiv

// Hilfsfunktionen
function extractPlaylistId(url) {
  const regex = /playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function getStoredPlaylistUrl() {
  return localStorage.getItem('mobilePlaylistUrl') || "";
}

function loadCategories() {
  const catStr = localStorage.getItem('mobileCategories');
  try {
    return catStr ? JSON.parse(catStr) : [];
  } catch (e) {
    console.error("Error parsing categories:", e);
    return [];
  }
}

function loadPlayers() {
  const playersStr = localStorage.getItem('mobilePlayers');
  try {
    return playersStr ? JSON.parse(playersStr) : [];
  } catch (e) {
    console.error("Error parsing players:", e);
    return [];
  }
}

function loadCurrentPlayerIndex() {
  const index = localStorage.getItem('currentPlayerIndex');
  return index ? parseInt(index) : 0;
}

function saveCurrentPlayerIndex(index) {
  localStorage.setItem('currentPlayerIndex', index.toString());
}

function updateScoreDisplay() {
  const scoreDisplay = document.getElementById('score-display');
  const currentPlayer = mobilePlayers[currentPlayerIndex] || "Unbekannt";
  const currentScore = playerScores[currentPlayerIndex] || 0;
  if (scoreDisplay) {
    scoreDisplay.textContent = `${currentPlayer}: ${currentScore} Punkte`;
    scoreDisplay.style.display = 'block';
  }
}

function updatePlayerDisplay(playerName) {
  const playerTurn = document.getElementById('player-turn');
  if (playerTurn) {
    playerTurn.textContent = playerName + ", du bist dran!";
    playerTurn.style.display = 'block';
  }
}

function showGameOverOverlay() {
  const overlay = document.getElementById('game-overlay');
  const scoreTableBody = document.querySelector('#score-table tbody');
  if (overlay && scoreTableBody) {
    scoreTableBody.innerHTML = "";
    let maxScore = -1;
    let winnerIndex = -1;
    for (let i = 0; i < mobilePlayers.length; i++) {
      if ((playerScores[i] || 0) > maxScore) {
        maxScore = playerScores[i] || 0;
        winnerIndex = i;
      }
      const row = document.createElement('tr');
      const playerCell = document.createElement('td');
      playerCell.textContent = mobilePlayers[i];
      const scoreCell = document.createElement('td');
      scoreCell.textContent = playerScores[i] || 0;
      row.appendChild(playerCell);
      row.appendChild(scoreCell);
      scoreTableBody.appendChild(row);
    }
    const winnerHeading = document.getElementById('winner-heading');
    if (winnerHeading && winnerIndex !== -1) {
      winnerHeading.innerHTML = `<i class="material-icons">emoji_events</i> Gewinner: ${mobilePlayers[winnerIndex]}`;
    }
    overlay.style.display = 'flex';
  }
}

function getWinningScore() {
  const scoreStr = localStorage.getItem('winningScore');
  return scoreStr ? parseInt(scoreStr, 10) : 10;
}

async function fetchPlaylistTracks(playlistId) {
  const token = localStorage.getItem('access_token');
  let allTracks = [];
  let limit = 50; // maximale Anzahl pro Anfrage
  let offset = 0;
  let total = 0;
  try {
    do {
      const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`;
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log("Playlist data received:", data);
      if (data && data.items) {
        allTracks = allTracks.concat(data.items);
        total = data.total; // Gesamtanzahl der Songs in der Playlist
        offset += limit;
      } else {
        console.error("Keine Tracks gefunden:", data);
        break;
      }
    } while (allTracks.length < total);
    console.log("Total loaded tracks:", allTracks.length);
    cachedPlaylistTracks = allTracks;
    return cachedPlaylistTracks;
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    return null;
  }
}

async function loadPlaylist() {
  const playlistUrl = getStoredPlaylistUrl();
  console.log("Stored Playlist URL:", playlistUrl);
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    console.error("Ungültige Playlist-ID – überprüfe die gespeicherte Playlist URL:", playlistUrl);
    M.toast({ html: "Ungültige Playlist URL", classes: "rounded", displayLength: 2000 });
    return;
  }
  await fetchPlaylistTracks(playlistId);
}

<<<<<<< HEAD

async function fetchUserName(userId) {
  const token = localStorage.getItem('access_token');
  try {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    // Falls display_name existiert, benutze diesen, ansonsten die ID
    return data.display_name && data.display_name.trim() !== "" ? data.display_name : data.id;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return userId;
  }
}
=======
>>>>>>> parent of a5efaac (Update mobile.js)

function getRandomTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}

function updateTrackDetails(track, addedBy) {
  const detailsContainer = document.getElementById('track-details');
  if (detailsContainer) {
    let title = track.name;
    if (title.includes("-")) {
      title = title.split("-")[0].trim();
    }
    detailsContainer.innerHTML = `<p id="track-info">Songinfos auflösen</p>`;
    detailsContainer.style.display = 'block';
    let expanded = false;
    detailsContainer.onclick = function() {
      if (!expanded) {
        // Nutze addedBy.display_name, falls vorhanden, sonst fall back auf addedBy.id
        let addedByName = "unbekannt";
        if (addedBy) {
          if (addedBy.display_name && addedBy.display_name.trim() !== "") {
            addedByName = addedBy.display_name;
          } else if (addedBy.id) {
            addedByName = addedBy.id;
          }
        }
        const fullDetails = `
          <p id="track-title">Titel: ${title}</p>
          <p id="track-artist">Interpret: ${track.artists.map(a => a.name).join(", ")}</p>
          <p id="track-year">Erscheinungsjahr: ${track.album.release_date.substring(0,4)}</p>
          <p id="track-added">Hinzugefügt von: ${addedByName}</p>
        `;
        detailsContainer.innerHTML = fullDetails;
        expanded = true;
      } else {
        detailsContainer.innerHTML = `<p id="track-info">Songinfos auflösen</p>`;
        expanded = false;
      }
    };
  }
}

<<<<<<< HEAD
=======

>>>>>>> parent of a5efaac (Update mobile.js)
function updateCategoryDisplay(category) {
  const categoryHeading = document.getElementById('category-heading');
  if (categoryHeading) {
    categoryHeading.textContent = category ? "Kategorie: " + category : "";
  }
}

// Spotify Web Playback SDK Setup – nur eine einzige Deklaration von spotifySDKReady
let spotifySDKReady = new Promise((resolve) => {
  window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const player = new Spotify.Player({
      name: 'Mobile Web Player',
      getOAuthToken: cb => { cb(token); }
    });
    window.mobilePlayer = player;
    player.addListener('ready', ({ device_id }) => {
      window.deviceId = device_id;
      console.log("Spotify player ready, device_id:", device_id);
    });
    player.addListener('initialization_error', ({ message }) => {
      console.error('Initialization Error:', message);
    });
    player.addListener('authentication_error', ({ message }) => {
      console.error('Authentication Error:', message);
    });
    player.addListener('account_error', ({ message }) => {
      console.error('Account Error:', message);
    });
    player.addListener('playback_error', ({ message }) => {
      console.error('Playback Error:', message);
    });
    player.connect().then(() => {
      window.playTrack = async function(trackUri) {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        let waitTime = 0;
        while (!window.deviceId && waitTime < 10000) {
          await new Promise(res => setTimeout(res, 200));
          waitTime += 200;
        }
        if (!window.deviceId) {
          console.error("Spotify player not ready");
          return false;
        }
        try {
          let response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({ uris: [trackUri] }),
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.status === 204) {
            console.log("Track started successfully.");
            return true;
          } else if (response.status === 401) {
            console.error("Session expired");
            return false;
          } else {
            const data = await response.json();
            console.error("Spotify API error:", data);
            return false;
          }
        } catch (error) {
          console.error("Error playing track:", error);
          return false;
        }
      };

      window.resumePlayback = async function() {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        try {
          let response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({}), // Leerer Body
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.status === 204) {
            console.log("Playback resumed successfully.");
            return true;
          } else {
            const data = await response.text();
            console.error("Error resuming playback:", data);
            return false;
          }
        } catch (error) {
          console.error("Error resuming playback:", error);
          return false;
        }
      };

      window.stopPlayback = async function() {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
          let response = await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.status === 204) {
            console.log("Playback stopped.");
          } else {
            const errorText = await response.text();
            console.error("Error stopping playback:", errorText);
          }
        } catch (error) {
          console.error("Error stopping track:", error);
        }
      };

      resolve();
    });
  };
});

// DOMContentLoaded-Block für alle Event Listener
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('access_token')) {
    window.location.href = 'index.html';
    return;
  }
  
  // Lade gespeicherte Kategorien und Mitspieler
  mobileCategories = loadCategories();
  mobilePlayers = loadPlayers();
  console.log("Geladene Kategorien:", mobileCategories);
  console.log("Geladene Mitspieler:", mobilePlayers);
  
  // Initialisiere playerScores, falls noch nicht vorhanden
  if (!localStorage.getItem('playerScores')) {
    playerScores = new Array(mobilePlayers.length).fill(0);
    localStorage.setItem('playerScores', JSON.stringify(playerScores));
  } else {
    try {
      playerScores = JSON.parse(localStorage.getItem('playerScores'));
    } catch (e) {
      playerScores = new Array(mobilePlayers.length).fill(0);
    }
  }
  
  // Lade aktuellen Spieler-Index
  currentPlayerIndex = loadCurrentPlayerIndex();
  updateScoreDisplay();
  updatePlayerDisplay(mobilePlayers[currentPlayerIndex] || "Unbekannt");
  
  // Aktiviere AudioContext (iOS)
  document.addEventListener('touchstart', function resumeAudioContext() {
    if (window.AudioContext || window.webkitAudioContext) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      context.resume();
    }
    document.removeEventListener('touchstart', resumeAudioContext);
  });
  

  
// Event Listener: Start-Button
startButton.addEventListener('click', async () => {
  // Verstecke den Start-Button und zeige den Steuerungsbereich an:
  startButton.style.display = 'none';
  controlButtons.style.display = 'block';
  document.getElementById('score-display').style.display = 'block';
  document.getElementById('category-heading').style.display = 'block';
  document.getElementById('player-turn').style.display = 'block';
  document.getElementById('correct-button').style.display = 'block';
  document.getElementById('wrong-button').style.display = 'block';
  scoreboardBtn.style.display = 'flex';

  // Lade die Playlist erst jetzt:
  await loadPlaylist();
  if (!cachedPlaylistTracks || cachedPlaylistTracks.length === 0) {
    M.toast({ html: "Playlist wurde nicht geladen.", classes: "rounded", displayLength: 2000 });
    return;
  }

  correctButton.disabled = false;
  wrongButton.disabled = false;
  const randomItem = getRandomTrack(cachedPlaylistTracks);
  console.log("Random Item:", randomItem);
  if (!randomItem || !randomItem.track) {
    M.toast({ html: "Kein Song gefunden", classes: "rounded", displayLength: 2000 });
    return;
  }
  selectedTrackUri = randomItem.track.uri;
  console.log("Ausgewählte Track URI:", selectedTrackUri);
  let randomCategory = "";
  if (mobileCategories && mobileCategories.length > 0) {
    const randomIndex = Math.floor(Math.random() * mobileCategories.length);
    randomCategory = mobileCategories[randomIndex];
  }
  console.log("Ausgewählte Kategorie:", randomCategory);
  updateCategoryDisplay(randomCategory);
  updateTrackDetails(randomItem.track, randomItem.added_by);
  await spotifySDKReady;
  // iOS: activateElement auf dem Start-Button (der Klick zählt als User-Interaktion)
  if (isIOS() && window.mobilePlayer && typeof window.mobilePlayer.activateElement === 'function') {
    window.mobilePlayer.activateElement(document.getElementById('start-button'));
  }
  const success = await window.playTrack(selectedTrackUri);
  if (!success) {
    M.toast({ html: "Fehler beim Abspielen des Songs", classes: "rounded", displayLength: 2000 });
  }
  firstRound = false; // Beim ersten Song bleibt Spieler 1 aktiv
  saveCurrentPlayerIndex(currentPlayerIndex);
  updateScoreDisplay();
  updatePlayerDisplay(mobilePlayers[currentPlayerIndex] || "Unbekannt");
  playButton.disabled = true;
});

  
  // Event Listener: "Nächster Song"-Button
  playButton.addEventListener('click', async () => {
    if (!cachedPlaylistTracks) {
      M.toast({ html: "Playlist wurde nicht geladen.", classes: "rounded", displayLength: 2000 });
      return;
    }
    correctButton.disabled = false;
    wrongButton.disabled = false;
    const randomItem = getRandomTrack(cachedPlaylistTracks);
    console.log("Random Item:", randomItem);
    if (!randomItem || !randomItem.track) {
      M.toast({ html: "Fehler beim Abrufen des Songs", classes: "rounded", displayLength: 2000 });
      return;
    }
    selectedTrackUri = randomItem.track.uri;
    console.log("Ausgewählte Track URI:", selectedTrackUri);
    let randomCategory = "";
    if (mobileCategories && mobileCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * mobileCategories.length);
      randomCategory = mobileCategories[randomIndex];
    }
    console.log("Ausgewählte Kategorie:", randomCategory);
    updateCategoryDisplay(randomCategory);
    updateTrackDetails(randomItem.track, randomItem.added_by);
    await spotifySDKReady;
    // iOS: activateElement auf dem "Nächster Song"-Button
    if (isIOS() && window.mobilePlayer && typeof window.mobilePlayer.activateElement === 'function') {
      window.mobilePlayer.activateElement(document.getElementById('play-button'));
    }
    const success = await window.playTrack(selectedTrackUri);
    if (!success) {
      M.toast({ html: "Fehler beim Abspielen des Songs", classes: "rounded", displayLength: 2000 });
    }
    if (!firstRound) {
      currentPlayerIndex = (currentPlayerIndex + 1) % mobilePlayers.length;
    }
    // Entferne den abgespielten Song aus dem Cache
    cachedPlaylistTracks = cachedPlaylistTracks.filter(item => item.track.uri !== selectedTrackUri);
    
    // Überprüfe, ob der Cache jetzt leer ist
    if (cachedPlaylistTracks.length === 0) {
      M.toast({ html: "Alle Songs der Playlist wurden abgespielt", classes: "rounded", displayLength: 3000 });
    }
    
    saveCurrentPlayerIndex(currentPlayerIndex);
    updateScoreDisplay();
    updatePlayerDisplay(mobilePlayers[currentPlayerIndex] || "Unbekannt");
    playButton.disabled = true;
  });
  
  
  
  // Event Listener: Bewertungsbuttons – stopPlayback wird automatisch aufgerufen, danach "Nächster Song" aktivieren
  const correctBtn = document.getElementById('correct-button');
  correctBtn.addEventListener('click', async () => {
    if (window.stopPlayback) await window.stopPlayback();
    correctBtn.disabled = true;
    wrongButton.disabled = true;
    playerScores[currentPlayerIndex] = (playerScores[currentPlayerIndex] || 0) + 1;
    localStorage.setItem('playerScores', JSON.stringify(playerScores));
    updateScoreDisplay();
    const winningScore = getWinningScore();
    if (playerScores[currentPlayerIndex] >= winningScore) {
      showGameOverOverlay();
    }
    playButton.disabled = false;
  });
  
  const wrongBtn = document.getElementById('wrong-button');
  wrongBtn.addEventListener('click', async () => {
    if (window.stopPlayback) await window.stopPlayback();
    correctBtn.disabled = true;
    wrongBtn.disabled = true;
    playButton.disabled = false;
  });
  
  // Scoreboard-Overlay: Öffne bei Klick auf den Scoreboard-Button
  const scoreOverlay = document.getElementById('score-overlay');
  const closeScoreOverlay = document.getElementById('close-score-overlay');
  if (scoreboardBtn && scoreOverlay && closeScoreOverlay) {
    scoreboardBtn.addEventListener('click', () => {
      const tableBody = document.querySelector('#scoreboard-table tbody');
      tableBody.innerHTML = "";
      for (let i = 0; i < mobilePlayers.length; i++) {
        const row = document.createElement('tr');
        const playerCell = document.createElement('td');
        playerCell.textContent = mobilePlayers[i];
        const scoreCell = document.createElement('td');
        scoreCell.textContent = playerScores[i] || 0;
        row.appendChild(playerCell);
        row.appendChild(scoreCell);
        tableBody.appendChild(row);
      }
      scoreOverlay.style.display = 'flex';
    });
    
    closeScoreOverlay.addEventListener('click', () => {
      scoreOverlay.style.display = 'none';
    });
  }
  
  // Reset-Button
  const resetButton = document.getElementById('reset-app');
  resetButton.addEventListener('click', () => {
    if (confirm("Möchtest du die App wirklich zurücksetzen?")) {
      logout();
    }
  });
  
  // Overlay-Button (Spielende)
  const overlayMenuBtn = document.getElementById('overlay-menu-btn');
  overlayMenuBtn.addEventListener('click', () => {
    window.location.href = 'menu.html';
  });
});

// Hilfsfunktion zur iOS-Erkennung
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Logout-Funktion
function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html';
}
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
    console.log(localStorage.getItem('mobilePlaylistUrl'));
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

function setViewportHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setViewportHeight();
window.addEventListener('resize', setViewportHeight);

document.addEventListener('DOMContentLoaded', () => {
  // Mitspieler hinzufügen
  document.getElementById('add-player').addEventListener('click', () => {
    const container = document.getElementById('players-container');
    const div = document.createElement('div');
    div.className = 'input-field';
    div.innerHTML = '<input class="player-input" type="text" value=""><label>Wer spielt noch mit?</label>';
    container.appendChild(div);
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

async function checkSpotifySessionValidity() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 401) {
      // Session ist abgelaufen
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error("Fehler beim Überprüfen der Spotify-Session:", error);
    // Optional: Bei einem Fehler ebenfalls umleiten oder eine Fehlermeldung anzeigen
  }
}

window.onload = () => {
  checkSpotifySessionValidity();
};