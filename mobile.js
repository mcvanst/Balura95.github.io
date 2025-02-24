// Globale Variable zum Zwischenspeichern der Playlist-Tracks
let cachedPlaylistTracks = null;
// Globale Variable zum Speichern der ausgewählten Track-URI
let selectedTrackUri = null;

// Hilfsfunktion: Extrahiere die Playlist-ID aus der URL
function extractPlaylistId(url) {
  const regex = /playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
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

// Funktion, die beim Klick auf "Playlist einlesen" aufgerufen wird
async function loadPlaylist() {
  const playlistUrl = document.getElementById('playlist-url').value;
  console.log("Playlist URL:", playlistUrl);
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    M.toast({ html: "Ungültige Playlist URL", classes: "rounded", displayLength: 2000 });
    return;
  }
  const tracks = await fetchPlaylistTracks(playlistId);
  if (tracks && tracks.length > 0) {
    M.toast({ html: `${tracks.length} Songs geladen`, classes: "rounded", displayLength: 2000 });
    console.log("Cached Playlist Tracks:", cachedPlaylistTracks);
    // Zeige den Button zum Zufällig-Auswählen eines Songs an
    const selectButton = document.getElementById('select-song');
    if (selectButton) {
      selectButton.style.display = 'inline-flex';
    } else {
      console.error("select-song button not found");
    }
  } else {
    M.toast({ html: "Keine Songs in dieser Playlist gefunden", classes: "rounded", displayLength: 2000 });
  }
}

// Wähle einen zufälligen Track aus einem Array aus
function getRandomTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}

// Promise, das aufgelöst wird, sobald der Spotify SDK bereit ist
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
    // Fehler-Listener (optional)
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
          await new Promise(resolve => setTimeout(resolve, 200));
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
      resolve();
    });
  };
});

// Konsolidierter DOMContentLoaded-Block für alle Event Listener
document.addEventListener('DOMContentLoaded', () => {
  // Falls kein Access Token vorhanden, umleiten
  if (!localStorage.getItem('access_token')) {
    window.location.href = 'index.html';
    return;
  }
  
  // AudioContext aktivieren (iOS)
  document.addEventListener('touchstart', function resumeAudioContext() {
    if (window.AudioContext || window.webkitAudioContext) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      context.resume();
    }
    document.removeEventListener('touchstart', resumeAudioContext);
  });
  
  // Event Listener für den "Playlist einlesen"-Button
  const cacheButton = document.getElementById('cache-button');
  if (cacheButton) {
    cacheButton.addEventListener('click', loadPlaylist);
  } else {
    console.error("cache-button not found");
  }
  
  // Event Listener für den "Zufälligen Song auswählen"-Button
  const selectButton = document.getElementById('select-song');
  if (selectButton) {
    selectButton.addEventListener('click', () => {
      if (!cachedPlaylistTracks) {
        M.toast({ html: "Bitte zuerst die Playlist einlesen.", classes: "rounded", displayLength: 2000 });
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
      M.toast({ html: "Zufälliger Song ausgewählt", classes: "rounded", displayLength: 2000 });
      // Zeige den Play-Button an
      const playButton = document.getElementById('play-button2');
      if (playButton) {
        playButton.style.display = 'inline-flex';
      } else {
        console.error("play-button not found");
      }
    });
  } else {
    console.error("select-song button not found");
  }
  
  // Event Listener für den Play-Button (zum Abspielen des ausgewählten Songs)
  const playButton = document.getElementById('play-button2');
  if (playButton) {
    playButton.addEventListener('click', async () => {
      if (!selectedTrackUri) {
        M.toast({ html: "Bitte zuerst einen Song auswählen", classes: "rounded", displayLength: 2000 });
        return;
      }
      console.log("Playing track URI:", selectedTrackUri);
      await spotifySDKReady;
      console.log("Device ID:", window.deviceId);
      const success = await window.playTrack(selectedTrackUri);
      if (!success) {
        M.toast({ html: "Fehler beim Abspielen des Songs", classes: "rounded", displayLength: 2000 });
      }
    });
  } else {
    console.error("play-button not found");
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
