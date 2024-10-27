const https = require('https');
const WebSocket = require('ws');

/**
 * Function to make HTTPS request to get the token
 * @param {string} server - The server address.
 * @param {string} path - The path for the token request (can be root or custom path).
 * @param {string} authHeader - The authorization header.
 * @param {boolean} rejectUnauthorized - Whether to reject self-signed certificates.
 * @returns {Promise<string>} - A promise that resolves to the token.
 */
function getToken(server, path, authHeader, rejectUnauthorized = true) {
  console.log('Starting token request...');
  
  // Construct the token path, ensuring that path and root cases are handled correctly
  const tokenPath = path ? (path.endsWith('/') ? `${path}token` : `${path}/token`) : '/token';
  
  return new Promise((resolve, reject) => {
    https.get(
      {
        hostname: server,
        path: tokenPath,
        headers: {
          'Authorization': authHeader,
        },
        rejectUnauthorized, // Handle self-signed certificates
      },
      (res) => {
        let data = '';

        console.log(`Token request status: ${res.statusCode}`);
        res.on('data', (chunk) => (data += chunk));

        res.on('end', () => {
          console.log('Token response received.');
          try {
            const token = JSON.parse(data).token;
            resolve(token);
          } catch (error) {
            reject(new Error('Failed to parse token response: ' + error.message));
          }
        });
      }
    ).on('error', (error) => {
      console.error('Error during token request:', error);
      reject(error);
    });
  });
}

/**
 * Function to start WebSocket communication
 * @param {string} server - The server address.
 * @param {string} token - The authentication token.
 * @param {string} authHeader - The authorization header.
 * @param {string} path - The WebSocket path (can be root or custom path).
 * @param {string} command - The command to execute.
 * @param {boolean} rejectUnauthorized - Whether to reject self-signed certificates.
 * @param {number} executionTimeout - The timeout in milliseconds before closing the WebSocket.
 * @param {function} onOutput - Callback for handling output messages.
 * @param {function} onError - Callback for handling errors.
 * @param {function} onClose - Callback for handling WebSocket closure.
 * @returns {Promise<void>}
 */
function startWebSocket(server, token, authHeader, path = '', command, rejectUnauthorized = true, executionTimeout = 200, onOutput, onError, onClose) {
  return new Promise((resolve, reject) => {
    console.log('Starting WebSocket connection...');
    
    // Construct the WebSocket URL, ensuring path handling is dynamic
    const wsPath = path ? (path.endsWith('/') ? `${path}ws` : `${path}/ws`) : '/ws';
    const wsUrl = `wss://${server}${wsPath}?arg=${command}`;

    const ws = new WebSocket(wsUrl, ['tty'], {
      headers: {
        'Authorization': authHeader,
      },
      rejectUnauthorized, // Handle self-signed certificates
    });

    let closeTimeout;

    ws.on('open', () => {
      const initData = { AuthToken: token };
      console.log('WebSocket connection opened');
      ws.send(JSON.stringify(initData));
      ws.send('ping'); // Optional: Send a ping or any message to initiate interaction
    });

    ws.on('message', (data) => {
      const message = data.toString();
      const messageType = message.charAt(0);
      const messageContent = message.slice(1);

      switch (messageType) {
        case '0': // OUTPUT
          if (onOutput) onOutput(messageContent);
          break;
        case '1': // SET_WINDOW_TITLE
          break;
        case '2': // SET_PREFERENCES
          break;
        default:
          console.warn(`[WARN]>Unknown message type '${messageType}'`);
          break;
      }

      // Reset the timeout on each message to wait for the specified duration after the last message
      clearTimeout(closeTimeout);
      closeTimeout = setTimeout(() => {
        console.log(`No further messages received. Closing WebSocket after ${executionTimeout}ms.`);
        ws.close();
      }, executionTimeout);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
      clearTimeout(closeTimeout);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket closed');
      if (onClose) onClose(code, reason);
      clearTimeout(closeTimeout);
      resolve();
    });
  });
}

/**
 * Main function to handle the full process
 * @param {Object} options - Options for the connection.
 * @param {string} options.server - The server address.
 * @param {string} options.path - The path for the HTTPS and WebSocket request.
 * @param {string} options.username - The Basic Auth username.
 * @param {string} options.password - The Basic Auth password.
 * @param {string} options.command - The command to execute via WebSocket.
 * @param {boolean} [options.rejectUnauthorized] - Whether to reject self-signed certificates.
 * @param {number} [options.executionTimeout] - The timeout in milliseconds before closing the WebSocket.
 * @param {function} options.onOutput - Callback for handling output messages.
 * @param {function} options.onError - Callback for handling errors.
 * @param {function} options.onClose - Callback for handling WebSocket closure.
 */
async function exexViaTTYD({
  server,
  path = '',
  username,
  password,
  command,
  rejectUnauthorized = true,
  executionTimeout = 400,
  onOutput,
  onError,
  onClose,
}) {
  try {
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    console.log('Starting token and WebSocket process...');
    const token = await getToken(server, path, authHeader, rejectUnauthorized);
    console.log('Token received:', token);
    await startWebSocket(
      server,
      token,
      authHeader,
      path,
      command,
      rejectUnauthorized,
      executionTimeout,
      onOutput,
      onError,
      onClose
    );
    console.log('WebSocket process completed.');
  } catch (error) {
    console.error('Error:', error);
    if (onError) onError(error);
  }
}

module.exports = exexViaTTYD;
