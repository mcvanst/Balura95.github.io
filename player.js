// --- Player Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  console.log("Access Token:", localStorage.getItem('access_token'));
  if (!localStorage.getItem('access_token')) {
    window.location.href = 'index.html';
    return;
  }
  toggleUIAfterLogin();
});


// Function to show the player area and start the QR scanner
function toggleUIAfterLogin() {
  document.getElementById('player-area').style.display = 'block';
  startQrScanner();
}

// --- QR-Code Scanner Setup ---
window.qrScannerActive = false;
window.qrScanner = null;

// --- QR-Code Scanner Setup ---
function startQrScanner() {
  if (window.qrScannerActive) return; // Prevent multiple scanners

  window.qrScanner = new Html5Qrcode("qr-reader");
  window.qrScannerActive = true;
  document.getElementById('qr-reader').style.display = 'block';
  
  // Falls ein Titel-Element vorhanden ist, aktualisieren wir es
  const titleElement = document.getElementById('title');
  if (titleElement) {
    titleElement.textContent = 'QR Code scannen';
  }
  
  document.getElementById('scan-next').style.display = 'none';

  const qrConfig = { fps: 10, qrbox: 250 };

  window.qrScanner.start(
    { facingMode: "environment" },
    qrConfig,
    (decodedText, decodedResult) => {
      console.log("QR Code Scanned:", decodedText);
      const cleanedText = decodedText.replace(/\s/g, '');
      const match = cleanedText.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const trackUri = `spotify:track:${match[1]}`;
        window.lastScannedTrackUri = trackUri;
        M.toast({html: "Song erfolgreich geladen", classes: "rounded", displayLength: 1000});
        stopQrScanner();
        // Statt direkt abzuspielen, zeigen wir den Play-Button an:
        document.getElementById('play-track').style.display = 'inline-flex';
      } else {
        M.toast({html: "Invalid Spotify QR Code. Try again.", classes: "rounded", displayLength: 1000});
      }
    }
  ).catch(err => console.error("QR code scanning failed:", err));
}

document.addEventListener('DOMContentLoaded', function resumeAudioContext() {
  if (window.AudioContext || window.webkitAudioContext) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    context.resume().then(() => {
      console.log("AudioContext reaktiviert");
    });
  }
  document.removeEventListener('touchstart', resumeAudioContext);
});


// Event Listener für den Play-Button hinzufügen
document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('play-track');
  if (playButton) {
    playButton.addEventListener('click', () => {
      // Starte die Wiedergabe über den Spotify-Player
      window.playTrack(window.lastScannedTrackUri);
      // Verstecke den Play-Button, zeige danach den Scan Next Button an
      playButton.style.display = 'none';
      document.getElementById('scan-next').style.display = 'inline-flex';
    });
  }
});


// Stops the scanner and shows "Scan Next Song" button
function stopQrScanner() {
  if (window.qrScanner) {
    window.qrScanner.stop().then(() => {
      window.qrScannerActive = false;
      document.getElementById('qr-reader').style.display = 'none';
      document.getElementById('title').textContent = 'Song läuft...';
      document.getElementById('scan-next').style.display = 'block';
    }).catch(err => console.error("Error stopping QR scanner:", err));
  }
}

// --- Spotify Web Playback SDK Integration ---
window.deviceId = null;

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  const player = new Spotify.Player({
    name: 'Web Player',
    getOAuthToken: cb => { cb(token); }
  });

  player.addListener('ready', ({ device_id }) => {
    window.deviceId = device_id;
  });
  
  player.connect();

  window.playTrack = async function(trackUri) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      M.toast({html: "Session expired. Please log in again.", classes: "rounded", displayLength: 1000});
      logout();
      return;
    }
    
    let waitTime = 0;
    while (!window.deviceId && waitTime < 10000) {
      await new Promise(resolve => setTimeout(resolve, 200));
      waitTime += 200;
    }
    if (!window.deviceId) {
      M.toast({html: "Spotify player is not ready yet. Try again soon.", classes: "rounded", displayLength: 1000});
      return;
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
        document.getElementById('scan-next').style.display = 'block';
      } else if (response.status === 401) {
        M.toast({html: "Session expired. Logging out...", classes: "rounded", displayLength: 1000});
        logout();
      } else {
        const data = await response.json();
        console.error("Spotify API error:", data);
      }
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  // --- STOP Current Playback Function ---
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
};

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('scan-next').addEventListener('click', () => {
    window.stopPlayback(); // Stop current song before scanning a new one
    startQrScanner();
  });
});

// --- Logout Function ---
function logout() {
  // Clear stored tokens and any cached data.
  localStorage.clear();
  sessionStorage.clear();
  // Redirect to the login page (adjust the URL as needed)
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const resetButton = document.getElementById('reset-app');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (confirm("Möchtest du die App wirklich zurücksetzen?")) {
        logout();
      }
    });
  }
});
