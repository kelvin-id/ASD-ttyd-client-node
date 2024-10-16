const WebSocket = require('ws');

class TTYDClient {
  constructor(options) {
    this.wsUrl = options.wsUrl;
    this.username = options.username;
    this.password = options.password;
    this.onOutput = options.onOutput || function () {};
    this.onError = options.onError || function () {};
    this.onClose = options.onClose || function () {};

    this.connect();
  }

  connect() {
    const token = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    const authHeader = `Basic ${token}`;

    const wsOptions = {
      headers: {
        Authorization: authHeader,
      },
      rejectUnauthorized: false,
    };

    this.ws = new WebSocket(this.wsUrl, 'tty', wsOptions);
    this.ws.binaryType = 'arraybuffer';

    this.ws.on('open', () => this.handleOpen(token));
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', (code, reason) => this.onClose(code, reason));
    this.ws.on('error', (err) => this.onError(err));
  }

  handleOpen(token) {
    const initData = { AuthToken: token };
    this.ws.send(JSON.stringify(initData));
  }

  handleMessage(data) {
    if (data instanceof ArrayBuffer) {
      const dataView = new Uint8Array(data);
      const messageType = String.fromCharCode(dataView[0]);
      const messageContent = dataView.slice(1);

      switch (messageType) {
        case '0': // OUTPUT
          const output = new TextDecoder('utf-8').decode(messageContent);
          this.onOutput(output);
          break;
        case '1': // SET_WINDOW_TITLE
          // Handle window title if needed
          break;
        case '2': // SET_PREFERENCES
          // Handle preferences if needed
          break;
        default:
          console.warn(`[WARN]>Unknown message type '${messageType}'`);
          break;
      }
    } else {
      console.log('[INFO]>Received non-binary message:', data);
    }
  }

  send(data) {
    this.ws.send(data);
  }

  close() {
    this.ws.close();
  }
}

module.exports = TTYDClient;
