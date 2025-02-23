// Globale Variable zum Zwischenspeichern der Playlist-Tracks
let cachedPlaylistTracks = null;

// Hilfsfunktion: Extrahiere die Playlist-ID aus der URL
function extractPlaylistId(url) {
  // Erwartetes Format: "https://open.spotify.com/playlist/PLAYLIST_ID?si=..."
  const regex = /playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Lade die Tracks der Playlist und speichere sie in cachedPlaylistTracks
async function fetchPlaylistTracks(playlistId) {
    const token = localStorage.getItem('access_token');
    const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log("Playlist data received:", data); // Gibt die komplette Antwort aus
      if (data && data.items) {
        console.log("Anzahl geladener Tracks:", data.items.length);
        return data.items; // Array von Track-Items
      } else {
        console.error("Keine Tracks gefunden:", data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
      return null;
    }
  }
  

// Wähle einen zufälligen Track aus dem Array
function getRandomTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}

// Definiere ein Promise, das aufgelöst wird, wenn der Spotify SDK bereit ist
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
    });
    // Optional: Fehler-Listener (hier nur loggen)
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
      // Sobald verbunden, definieren wir window.playTrack und lösen das Promise auf.
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

// Event Listener für den Play-Button in mobil.html
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('access_token')) {
    window.location.href = 'index.html';
    return;
  }
  // Bei Touch: AudioContext aktivieren (iOS)
  document.addEventListener('touchstart', function resumeAudioContext() {
    if (window.AudioContext || window.webkitAudioContext) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      context.resume();
    }
    document.removeEventListener('touchstart', resumeAudioContext);
  });
  
  document.getElementById('play-button').addEventListener('click', playRandomTrack);
});

// Funktion, die einen zufälligen Track aus der eingegebenen Playlist abspielt
async function playRandomTrack() {
  const playlistUrl = document.getElementById('playlist-url').value;
  console.log("URL", playlistUrl); // Gibt die komplette Antwort aus
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    M.toast({ html: "Ungültige Playlist URL", classes: "rounded", displayLength: 2000 });
    return;
  }
  const tracks = await fetchPlaylistTracks(playlistId);
  if (!tracks || tracks.length === 0) {
    M.toast({ html: "Keine Songs in dieser Playlist gefunden", classes: "rounded", displayLength: 2000 });
    return;
  }
  const randomItem = getRandomTrack(tracks);
  console.log(randomItem);
  if (!randomItem || !randomItem.track) {
    M.toast({ html: "Fehler beim Abrufen des Songs", classes: "rounded", displayLength: 2000 });
    return;
  }
  const trackUri = randomItem.track.uri;
  // Stelle sicher, dass der SDK bereit ist
  await spotifySDKReady;
  const success = await window.playTrack(trackUri);
  if (!success) {
    M.toast({ html: "Fehler beim Abspielen des Songs", classes: "rounded", displayLength: 2000 });
  }
}
