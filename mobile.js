// mobile.js

// Globales Promise, das aufgelöst wird, wenn der Spotify SDK bereit ist.
let spotifySDKReady = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        reject("Kein Access Token");
        return;
      }
      const player = new Spotify.Player({
        name: 'Mobile Web Player',
        getOAuthToken: cb => { cb(token); }
      });
      window.mobilePlayer = player;
      player.addListener('ready', ({ device_id }) => {
        window.deviceId = device_id;
        resolve();
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
      player.connect();
    };
  });
  
  // Globales Cache-Array für Playlist-Tracks
  let cachedTracks = null;
  
  // Hilfsfunktion: Extrahiere die Playlist-ID aus der URL
  function extractPlaylistId(url) {
    // Erwartetes Format: "https://open.spotify.com/playlist/PLAYLIST_ID?..."
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  
  // Funktion, um die Tracks der Playlist per Spotify API abzurufen
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
      return data.items; // Array von Items (jedes Item enthält ein "track"-Objekt)
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
      return null;
    }
  }
  
  // Funktion, um einen zufälligen Track aus dem Cache auszuwählen
  function getRandomTrack(tracks) {
    if (!tracks || tracks.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    return tracks[randomIndex];
  }
  
  // Initialisierung: Prüfe, ob ein Access Token vorhanden ist und aktiviere den AudioContext (iOS)
  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('access_token')) {
      window.location.href = 'index.html';
      return;
    }
    
    // Aktiviere den AudioContext bei der ersten Berührung (iOS)
    document.addEventListener('touchstart', function resumeAudioContext() {
      if (window.AudioContext || window.webkitAudioContext) {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        context.resume();
      }
      document.removeEventListener('touchstart', resumeAudioContext);
    });
    
    // Event Listener für den Play-Button
    document.getElementById('play-button').addEventListener('click', async () => {
      const playlistUrl = document.getElementById('playlist-url').value;
      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        M.toast({ html: "Ungültige Playlist URL", classes: "rounded", displayLength: 2000 });
        return;
      }
      
      // Wenn die Tracks noch nicht gecached wurden, lade sie einmalig
      if (!cachedTracks) {
        cachedTracks = await fetchPlaylistTracks(playlistId);
      }
      
      if (!cachedTracks || cachedTracks.length === 0) {
        M.toast({ html: "Keine Songs in dieser Playlist gefunden", classes: "rounded", displayLength: 2000 });
        return;
      }
      
      const randomItem = getRandomTrack(cachedTracks);
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
    });
  });
  