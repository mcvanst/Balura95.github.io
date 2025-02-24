// Globale Variablen
let cachedPlaylistTracks = null;
let selectedTrackUri = null;
let mobileCategories = [];
let mobilePlayers = [];
let currentPlayerIndex = 0;
let playerScores = [];

// Hilfsfunktion: Extrahiere die Playlist-ID aus einer URL
function extractPlaylistId(url) {
  const regex = /playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Liefert die gespeicherte Playlist-URL (wird in categories.html gesetzt)
function getStoredPlaylistUrl() {
  return localStorage.getItem('mobilePlaylistUrl') || "";
}

// Lade gespeicherte Kategorien aus localStorage
function loadCategories() {
  const catStr = localStorage.getItem('mobileCategories');
  if (catStr) {
    try {
      return JSON.parse(catStr);
    } catch (e) {
      console.error("Error parsing categories:", e);
      return [];
    }
  }
  return [];
}

// Lade gespeicherte Mitspieler aus localStorage
function loadPlayers() {
  const playersStr = localStorage.getItem('mobilePlayers');
  if (playersStr) {
    try {
      return JSON.parse(playersStr);
    } catch (e) {
      console.error("Error parsing players:", e);
      return [];
    }
  }
  return [];
}

// Lade aktuellen Spieler-Index aus localStorage (oder setze 0)
function loadCurrentPlayerIndex() {
  const index = localStorage.getItem('currentPlayerIndex');
  return index ? parseInt(index) : 0;
}

// Speichere aktuellen Spieler-Index in localStorage
function saveCurrentPlayerIndex(index) {
  localStorage.setItem('currentPlayerIndex', index.toString());
}

// Aktualisiere die Scoreanzeige (oben rechts) und den aktuellen Spieler-Header
function updateScoreDisplay() {
  const scoreDisplay = document.getElementById('score-display');
  const currentPlayer = mobilePlayers[currentPlayerIndex] || "Unbekannt";
  const currentScore = playerScores[currentPlayerIndex] || 0;
  if (scoreDisplay) {
    scoreDisplay.textContent = `${currentPlayer}: ${currentScore} Punkte`;
  }
}

function updatePlayerDisplay(playerName) {
  const playerTurn = document.getElementById('player-turn');
  if (playerTurn) {
    playerTurn.textContent = "Spieler: " + playerName;
  }
}

// Funktion zum Abrufen und Cachen der Playlist-Tracks
async function fetchPlaylistTracks(playlistId) {
  const token = localStorage.getItem('access_token');
  const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
  try {
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log("Playlist data received:", data);
    if (data && data.items) {
      console.log("Anzahl geladener Tracks:", data.items.length);
      cachedPlaylistTracks = data.items;
      return cachedPlaylistTracks;
    } else {
      console.error("Keine Tracks gefunden:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    return null;
  }
}

// Funktion zum Laden der Playlist aus dem gespeicherten Wert
async function loadPlaylist() {
  const playlistUrl = getStoredPlaylistUrl();
  console.log("Stored Playlist URL:", playlistUrl);
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    M.toast({ html: "Ungültige gespeicherte Playlist URL", classes: "rounded", displayLength: 2000 });
    return;
  }
  const tracks = await fetchPlaylistTracks(playlistId);
  if (tracks && tracks.length > 0) {
    M.toast({ html: `${tracks.length} Songs geladen`, classes: "rounded", displayLength: 2000 });
    console.log("Cached Playlist Tracks:", cachedPlaylistTracks);
  } else {
    M.toast({ html: "Keine Songs in der gespeicherten Playlist gefunden", classes: "rounded", displayLength: 2000 });
  }
}

// Funktion: Zufälligen Track auswählen
function getRandomTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}

// Aktualisiert die Songinfos-Box.
// Zuerst wird nur "Songinfos" angezeigt; bei Klick toggelt sie zu vollständigen Details.
// Zusätzlich wird der Songtitel bearbeitet: Alles ab dem ersten Bindestrich wird entfernt.
function updateTrackDetails(track, addedBy) {
  const detailsContainer = document.getElementById('track-details');
  if (detailsContainer) {
    let title = track.name;
    if (title.includes("-")) {
      title = title.split("-")[0].trim();
    }
    detailsContainer.innerHTML = `<p id="track-info">Songinfos</p>`;
    detailsContainer.style.display = 'block';
    let expanded = false;
    detailsContainer.onclick = function() {
      if (!expanded) {
        const fullDetails = `
          <p id="track-title">Titel: ${title}</p>
          <p id="track-artist">Interpret: ${track.artists.map(a => a.name).join(", ")}</p>
          <p id="track-year">Erscheinungsjahr: ${track.album.release_date.substring(0,4)}</p>
          <p id="track-added">Hinzugefügt von: ${addedBy ? addedBy.id : "unbekannt"}</p>
        `;
        detailsContainer.innerHTML = fullDetails;
        expanded = true;
      } else {
        detailsContainer.innerHTML = `<p id="track-info">Songinfos</p>`;
        expanded = false;
      }
    };
  }
}

// Aktualisiert den Kategorie-Header (ganz oben)
function updateCategoryDisplay(category) {
  const categoryHeading = document.getElementById('category-heading');
  if (categoryHeading) {
    categoryHeading.textContent = "Kategorie: " + category;
  }
}

// Aktualisiert die Anzeige des aktuellen Mitspielers (unterhalb der Kategorie)
function updatePlayerDisplay(playerName) {
  const playerTurn = document.getElementById('player-turn');
  if (playerTurn) {
    playerTurn.textContent = "Spieler: " + playerName;
  }
}

// Spotify Web Playback SDK Setup
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
    // Optionale Fehler-Listener
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
            console.error("Error stopping playback:", await response.json());
          }
        } catch (error) {
          console.error("Error stopping track:", error);
        }
      };

      resolve();
    });
  };
});

// DOMContentLoaded-Block für Event Listener
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('access_token')) {
    window.location.href = 'index.html';
    return;
  }
  
  // Lade gespeicherte Kategorien und Mitspieler aus localStorage
  mobileCategories = loadCategories();
  mobilePlayers = loadPlayers();
  console.log("Geladene Kategorien:", mobileCategories);
  console.log("Geladene Mitspieler:", mobilePlayers);
  
  // Initialisiere playerScores (falls noch nicht vorhanden)
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
  
  // Playlist laden (aus gespeicherter URL)
  loadPlaylist();
  
  // Event Listener für den Play-Button
  const playButton = document.getElementById('play-button');
  if (playButton) {
    playButton.addEventListener('click', async () => {
      if (!cachedPlaylistTracks) {
        M.toast({ html: "Playlist wurde nicht geladen.", classes: "rounded", displayLength: 2000 });
        return;
      }
      const randomItem = getRandomTrack(cachedPlaylistTracks);
      console.log("Random Item:", randomItem);
      if (!randomItem || !randomItem.track) {
        M.toast({ html: "Fehler beim Abrufen des Songs", classes: "rounded", displayLength: 2000 });
        return;
      }
      selectedTrackUri = randomItem.track.uri;
      console.log("Ausgewählte Track URI:", selectedTrackUri);
      // Wähle zufällig eine Kategorie aus
      let randomCategory = "";
      if (mobileCategories && mobileCategories.length > 0) {
        const randomIndex = Math.floor(Math.random() * mobileCategories.length);
        randomCategory = mobileCategories[randomIndex];
      }
      console.log("Ausgewählte Kategorie:", randomCategory);
      updateCategoryDisplay(randomCategory);
      // Aktualisiere Songinfos-Box (nur "Songinfos" initial)
      updateTrackDetails(randomItem.track, randomItem.added_by);
      // Spiele den Song ab
      await spotifySDKReady;
      const success = await window.playTrack(selectedTrackUri);
      if (!success) {
        M.toast({ html: "Fehler beim Abspielen des Songs", classes: "rounded", displayLength: 2000 });
      }
    });
  } else {
    console.error("play-button not found");
  }
  
  // Event Listener für den Stop-Button
  const stopButton = document.getElementById('stop-button');
  if (stopButton) {
    stopButton.addEventListener('click', async () => {
      if (window.stopPlayback) {
        await window.stopPlayback();
        M.toast({ html: "Playback gestoppt", classes: "rounded", displayLength: 2000 });
      } else {
        console.error("stopPlayback is not defined");
      }
    });
  } else {
    console.error("stop-button not found");
  }
  
  // Event Listener für den "Richtig"-Button (grünes Häkchen)
  const correctButton = document.getElementById('correct-button');
  if (correctButton) {
    correctButton.addEventListener('click', () => {
      // Aktueller Spieler bekommt einen Punkt
      playerScores[currentPlayerIndex] = (playerScores[currentPlayerIndex] || 0) + 1;
      localStorage.setItem('playerScores', JSON.stringify(playerScores));
      updateScoreDisplay();
      // Prüfe, ob 10 Punkte erreicht wurden
      if (playerScores[currentPlayerIndex] >= 10) {
        M.toast({ html: `Spiel beendet! ${mobilePlayers[currentPlayerIndex]} hat gewonnen!`, classes: "rounded", displayLength: 4000 });
        // Optional: Spiel zurücksetzen oder andere Aktion
      } else {
        // Wechsle zum nächsten Spieler
        currentPlayerIndex = (currentPlayerIndex + 1) % mobilePlayers.length;
        saveCurrentPlayerIndex(currentPlayerIndex);
        updateScoreDisplay();
        updatePlayerDisplay(mobilePlayers[currentPlayerIndex] || "Unbekannt");
      }
    });
  } else {
    console.error("correct-button not found");
  }
  
  // Event Listener für den "Falsch"-Button (rotes Kreuz)
  const wrongButton = document.getElementById('wrong-button');
  if (wrongButton) {
    wrongButton.addEventListener('click', () => {
      // Kein Punkt, einfach zum nächsten Spieler wechseln
      currentPlayerIndex = (currentPlayerIndex + 1) % mobilePlayers.length;
      saveCurrentPlayerIndex(currentPlayerIndex);
      updateScoreDisplay();
      updatePlayerDisplay(mobilePlayers[currentPlayerIndex] || "Unbekannt");
    });
  } else {
    console.error("wrong-button not found");
  }
  
  // Event Listener für den Reset-Button
  const resetButton = document.getElementById('reset-app');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (confirm("Möchtest du die App wirklich zurücksetzen?")) {
        logout();
      }
    });
  } else {
    console.error("reset-app not found");
  }
});

// Logout-Funktion
function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html';
}
