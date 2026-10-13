require('module-alias/register');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

// Make sure we are running node 7.6+
const [major, minor] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  console.log('Please upgrade your node.js version at least 20 or greater. 👌\n ');
  process.exit();
}

// import environmental variables from our variables.env file
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

mongoose.connect(process.env.DATABASE);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

mongoose.connection.on('error', (error) => {
  console.log(
    `1. 🔥 Common Error caused issue → : check your .env file first and add your mongodb url`
  );
  console.error(`2. 🚫 Error → : ${error.message}`);
});

const modelsFiles = globSync(path.resolve(__dirname, 'models/**/*.js').replace(/\\/g, '/'));

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

// Start our app!
const app = require('./app');
app.set('port', process.env.PORT || 8888);

const { setSocketIO } = require('./socket');

// Socket.IO real-time server with authenticated connections
let io = null;
let isInitialized = false;

try {
  const http = require('http').createServer(app);
  const ioModule = require('socket.io')(http, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://127.0.0.1:4173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io = ioModule;
  setSocketIO(io);

  io.on('connection', (socket) => {
    try {
      // Authenticate socket connection using existing JWT mechanism
      const authHeader = socket.handshake.auth.authorization;
      if (!authHeader) {
        console.warn('Socket connection without authorization header');
        socket.disconnect();
        return;
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      // Verify the token using the same middleware as HTTP routes
      const isValidAuthToken = require('./middlewaresControllers/createAuthMiddleware/isValidAuthToken');
      try {
        isValidAuthToken(
          { 
            headers: { 'authorization': `Bearer ${token}` }, 
            user: null 
          }, 
          { 
            status: () => {}, 
            json: () => {} 
          }, 
          async (err) => {
            if (err) {
              console.warn('Socket authentication failed:', err.message);
              socket.disconnect();
              return;
            }
            
            // Token is valid - req.user was set by isValidAuthToken
            // Attach the authenticated user to the socket
            const user = socket.request?.user || socket.user;
            if (!user) {
              console.warn('No user authenticated on socket');
              socket.disconnect();
              return;
            }

            // Join user to their private room based on user ID
            // Format: user:{userId} - never let client subscribe to arbitrary rooms
            const roomId = `user_${user._id}`;
            socket.join(roomId);

            console.log(`Socket connected: user ${user._id} (${user.role}) in room ${roomId}`);

            // Send existing unread notifications after successful auth and room assignment
            const Notification = require('./models/appModels/Notification');
            Notification.find({ recipient: user._id, read: false })
              .sort({ created: -1 })
              .limit(50)
              .lean()
              .then((notifications) => {
                socket.emit('initial-notifications', {
                  success: true,
                  notifications,
                  unreadCount: notifications.length,
                });
              })
              .catch((err) => {
                console.error('Error fetching initial notifications:', err);
              });

            // Handle disconnect
            socket.on('disconnect', () => {
              console.log(`Socket disconnected: user ${user._id}`);
            });

            // Handle re-connection
            socket.on('reconnect', (attemptNumber) => {
              console.log(`Socket reconnected: user ${user._id}, attempt ${attemptNumber}`);
              // Re-join the room on reconnect
              socket.join(roomId);
              // Re-fetch unread notifications
              Notification.find({ recipient: user._id, read: false })
                .sort({ created: -1 })
                .limit(50)
                .lean()
                .then((notifications) => {
                  socket.emit('initial-notifications', {
                    success: true,
                    notifications,
                    unreadCount: notifications.length,
                  });
                })
                .catch((err) => {
                  console.error('Error re-fetching notifications:', err);
                });
            });
          }
        );
      } catch (verifyError) {
        console.error('Socket verification error:', verifyError.message);
        socket.disconnect();
      }
    } catch (error) {
      console.error('Socket connection error:', error.message);
      socket.disconnect();
    }
  });

  const httpServer = http.listen(app.get('port'), () => {
    console.log(`Server running → HTTP: ${httpServer.address().port}, Socket.IO enabled`);
  });

  // Mark as initialized so other modules can safely import io
  isInitialized = true;

  // Export io for use in other modules
  module.exports = { app, server: httpServer, io };
} catch (ioError) {
  console.error('Failed to initialize Socket.IO:', ioError.message);
  const server = app.listen(app.get('port'), () => {
    console.log(`Express running → On PORT : ${app.get('port')} (Socket.IO disabled)`);
  });
  module.exports = { app, server };
}