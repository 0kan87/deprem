import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const API_URL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
let lastEarthquakeId = null;
let earthquakeCache = [];

// Deprem verilerini çek
async function fetchEarthquakes() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('API yanıt vermedi');
    
    const data = await response.json();
    
    if (data.status && data.result && data.result.length > 0) {
      const newEarthquakes = data.result.slice(0, 50).map(eq => ({
        id: eq.earthquake_id,
        date: eq.date || formatDate(eq.date_time),
        time: eq.time || formatTime(eq.date_time),
        dateTime: eq.date_time,
        latitude: parseFloat(eq.geojson?.coordinates?.[1] || eq.lat),
        longitude: parseFloat(eq.geojson?.coordinates?.[0] || eq.lng),
        depth: parseFloat(eq.depth),
        magnitude: parseFloat(eq.mag),
        location: eq.title || eq.location_properties?.epiCenter?.name || 'Bilinmeyen Konum',
        city: eq.location_properties?.epiCenter?.name || '',
        district: eq.location_properties?.closestCity?.name || ''
      }));

      const latestEarthquake = newEarthquakes[0];
      
      // Yeni deprem kontrolü
      if (lastEarthquakeId && lastEarthquakeId !== latestEarthquake.id) {
        console.log(`🚨 YENİ DEPREM: ${latestEarthquake.magnitude} - ${latestEarthquake.location}`);
        
        // Tüm bağlı istemcilere bildir
        io.emit('newEarthquake', latestEarthquake);
      }
      
      lastEarthquakeId = latestEarthquake.id;
      earthquakeCache = newEarthquakes;
      
      return newEarthquakes;
    }
  } catch (err) {
    console.error('Deprem verileri alınamadı:', err.message);
  }
  return earthquakeCache;
}

function formatDate(dateTime) {
  if (!dateTime) return new Date().toLocaleDateString('tr-TR');
  const date = new Date(dateTime);
  return date.toLocaleDateString('tr-TR');
}

function formatTime(dateTime) {
  if (!dateTime) return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(dateTime);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// REST API endpoint
app.get('/api/earthquakes', async (req, res) => {
  const earthquakes = await fetchEarthquakes();
  res.json({ status: true, result: earthquakes });
});

// WebSocket bağlantıları
io.on('connection', (socket) => {
  console.log(`✅ İstemci bağlandı: ${socket.id}`);
  
  // Bağlanan istemciye mevcut verileri gönder
  if (earthquakeCache.length > 0) {
    socket.emit('earthquakes', earthquakeCache);
  }
  
  socket.on('disconnect', () => {
    console.log(`❌ İstemci ayrıldı: ${socket.id}`);
  });
});

// Her 10 saniyede bir kontrol et (daha hızlı güncelleme)
setInterval(async () => {
  const earthquakes = await fetchEarthquakes();
  if (earthquakes.length > 0) {
    io.emit('earthquakes', earthquakes);
  }
}, 10000);

// İlk yükleme
fetchEarthquakes();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🌍 Deprem Takip Sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`📡 WebSocket aktif`);
});
