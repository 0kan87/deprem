import { Server } from 'socket.io';

let io;

export default function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Deprem verilerini periyodik olarak kontrol et
    setInterval(async () => {
      try {
        const response = await fetch('https://api.orhanaydogdu.com.tr/deprem/kandilli/live');
        const data = await response.json();
        
        if (data.status && data.result) {
          const earthquakes = data.result.slice(0, 50);
          io.emit('earthquakes', earthquakes);
        }
      } catch (err) {
        console.error('Deprem verileri alınamadı:', err);
      }
    }, 10000);
  }

  res.end();
}
