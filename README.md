# ASD-ttyd-client

This package is a Node.js client library for connecting to TTYD servers via WebSockets by using the `--url-arg` feature, enabling command execution and terminal output handling with support for authentication.

Build for the [ASD](https://github.com/kelvin-id/asd) project that utilizes [TTYD](https://github.com/tsl0922/ttyd) as a web interface for offering terminal capabilities and the TTYD websocket client for automating actions inside containers for ⚡ Accelerated Software Development and 🚀 Automated Service Deployment

## Installation

```bash
npm install asd-ttyd-client
```

### Usage

To use the `asd-ttyd-client` library, you need to configure it with several options. Here's a breakdown of what each option does:

- **server**: The address of the TTYD server you want to connect to. This should be a URL, such as `unique-url.eu.asd.engineer`.

- **path**: The path for the HTTPS and WebSocket request. Typically, this is set to `'/'`.

- **username** and **password**: These are used for Basic Authentication. Provide the credentials required to access the TTYD server.

- **command**: The command you wish to execute on the server via WebSocket. This is passed as a URL argument.

- **rejectUnauthorized**: A boolean value that determines whether to reject self-signed certificates. Set this to `false` if you're using self-signed certificates and want to bypass the security check.

- **executionTimeout**: An optional parameter that specifies the timeout in milliseconds before the WebSocket connection is closed. This can be useful to prevent hanging connections.

- **onOutput**: A callback function that handles output messages from the server. This function receives the output as its argument.

- **onError**: A callback function for handling errors. It receives the error object as its argument.

- **onClose**: A callback function that is called when the WebSocket connection is closed. It receives the closure code and reason as arguments.

Here's an example of how to set up the client:

```javascript
const exexViaTTYD = require('asd-ttyd-client');

exexViaTTYD({
  server: '<unique-url.eu.asd.engineer>',
  path: '/',
  username: '<Basic_Auth>',
  password: '<Basic_Auth>',
  command: '<TTYD url-arg>',
  rejectUnauthorized: false,
  executionTimeout: 1200, // Optional: Defaults to wait 400ms for each websocket message before closing
  onOutput: (output) => {
    console.log('[OUTPUT]>', output);
  },
  onError: (error) => {
    console.error('[ERROR]>', error);
  },
  onClose: (code, reason) => {
    console.log('[CLOSED]>', code, reason);
  }
});
```

## TTYD

##### Run TTYD and allow URL arguments

Start TTYD with the `-a, --url-arg` flag to allow clients to send command-line arguments in the URL (e.g., `http://localhost:7681?arg=foo&arg=bar`) and optionally the `-H, --auth-header` flag to configure TTYD to let an HTTP reverse proxy handle authentication.

To use `--url-arg`, use the following command: 

```bash
ttyd --url-arg ./parse-ttyd-url-arg.sh 
```

##### Using a reverse proxy with TTYD

To accept the `-H X-WEBAUTH-USER` header argument, use the following command:

```bash
ttyd -i /tmp/ttyd.sock -H X-WEBAUTH-USER --url-arg ./parse-ttyd-url-arg.sh 
```

Example file for passing commands via query params to TTYD `parse-ttyd-url-arg.sh`
```bash
#!/bin/bash

# If no arguments are provided, start an interactive bash shell
if [ $# -eq 0 ]; then
    top
else
    arg="$1"

    case "$arg" in
        bash)
            exec /bin/bash
            ;;
        zsh)
            exec /bin/zsh
            ;;
        lazydocker) # love to use this in my docker containers
            lazydocker
            ;;
        *)
            # Directly execute the passed argument
            $arg
            ;;
    esac

    # Keep running after command exec
    tail -f /dev/null
fi
```
Argument Handling:

- If no arguments are passed, it shows top.
- If the argument is bash, it starts an interactive bash shell.
- If the argument is lazydocker, it runs lazydocker.

For any other argument, it simply executes it directly ($arg).

After the argument is executed, `tail -f /dev/null` ensures the process keeps running.


## Auth Proxy

See [TTYD Auth Proxy](https://github.com/tsl0922/ttyd/wiki/Auth-Proxy) docs for Apache and NGINX.

## [Caddy](https://caddyserver.com/)

The header you need to use in Caddy is X-WEBAUTH-USER, which is the same header that ttyd expects for its Auth Proxy feature. In your Caddy configuration, you should set this header to the authenticated username obtained from Caddy's basic authentication. This can be achieved using the {http.auth.user} placeholder in Caddy.

**Example**

```Caddy
    handle_path /ttyd* {
        basicauth {
            user1 bcrypt_hashed_pass1
            user2 bcrypt_hashed_pass2
            # Add more users as needed
        }
        reverse_proxy http://ttyd:7681 {
            # Set the X-WEBAUTH-USER header to the authenticated username
            header_up X-WEBAUTH-USER {http.auth.user}
            transport http {
                # Use HTTP/1.1 for the proxy connection
                versions 1.1
            }
        }
    }
```

### Password hashing

Caddy requires passwords to be hashed using bcrypt.

Example command to generate a bcrypt-hashed password:

```bash
caddy hash-password --plaintext 'yourpassword'
```

Use the output hash in your `basicauth` directive.
