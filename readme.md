# YouTube Proxy Relay

Embed and control YouTube videos inside environments (e.g. iOS web view wrappers or constrained origins) that otherwise reject or break direct `iframe` loads because of origin/referrer or script policy issues.

This repository provides two cooperating JavaScript classes:
- `YouTubeProxy` (loaded in your application) – creates a local iframe that points to a lightweight proxy page and marshals API requests via `postMessage`.
- `YouTubeRelay` (loaded in the proxy page) – initializes the YouTube IFrame Player API, executes requested actions, and relays events back to the parent.

## Features
- Origin “bridge” using `postMessage`
- Minimal proxy surface (only one HTML file + one JS file)
- Supports common YouTube player actions (play, pause, seek, load by id, volume)
- Exposes duration and current time updates
- Event callbacks (`onReady`, `onStateChange`, `onError`)
- Throttled messaging to reduce chatter

## How It Works
1. Your app instantiates `YouTubeProxy` with a `proxyURL` (e.g. `https://your.server.com/proxy.html`).
2. `YouTubeProxy` injects an iframe whose `src` contains a Base64 encoded payload (video + config + allowed origins).
3. The proxy page (`proxy.html`) loads `YouTubeRelay`, decodes the payload, boots the YouTube IFrame API, and listens for parent commands.
4. Commands and events flow via `window.postMessage` restricted by the supplied `appOrigin` and `webOrigin`.

## Quick Start
1. Copy the `js/` directory plus `proxy.html` into a publicly served location.
2. Include `youtube.proxy.class.js` in your app and instantiate:

```
<script src="./js/youtube.proxy.class.js"></script>
<script>
	const player = new YouTubeProxy('youtube-container', {
		videoId   : 'aqz-KE-bpKQ',
		proxyURL  : 'https://your.server.com/proxy.html',
		appOrigin : window.location.origin,   // app domain
		webOrigin : 'https://your.server.com', // proxy origin
		playerVars: { autoplay: 1, playsinline: 1, controls: 0 },
		events    : {
			onReady: e => console.log('Ready', e),
			onStateChange: e => console.log('State', e.data),
			onError: e => console.error('Error', e.data)
		}
	});
	// Example controls
	// player.playVideo();
	// player.pauseVideo();
	// player.seekTo(30);
    // player.loadVideoById({videoId: ''})
</script>
```

## Configuration (Constructor Args)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `containerID` | string | (required) | DOM element ID where the iframe is injected |
| `width` | string | `100%` | Iframe width |
| `height` | string | `100%` | Iframe height |
| `proxyURL` | string | `` | Path/URL to `proxy.html` |
| `webOrigin` | string | `` | Origin of proxy (used to validate incoming messages) |
| `appOrigin` | string | `` | Origin of app (relay only accepts from this) |
| `videoId` | string | `` | Initial YouTube video ID |
| `playerVars` | object | `{}` | Standard YouTube IFrame API player vars |
| `events` | object | `{}` | Callback map |
| `notifyThrottle` | number | `5` | ms throttle for outbound messages |

## API (YouTubeProxy Methods)
| Method | Description |
|--------|-------------|
| `playVideo()` | Start playback |
| `pauseVideo()` | Pause playback |
| `stopVideo()` | Stop playback |
| `seekTo(time, allowSeekAhead=true)` | Seek to time (seconds) |
| `setVolume(volume)` | Set volume (0–100) |
| `loadVideoById({videoId, startSeconds, endSeconds})` | Load a new video |
| `getDuration()` | Returns cached duration (seconds) |
| `getCurrentTime()` | Returns cached current time (seconds) |

Events are emitted via the provided callbacks: `onReady`, `onStateChange`, `onError`.



## Origin & Security Considerations
- Always set explicit `appOrigin` and `webOrigin` (avoid using `*` in production).
- The relay validates message origin; mismatches are ignored.
- Payload is passed via a Base64 query param – avoid placing secrets inside it.
- Consider hosting the proxy with CSP headers.

## Troubleshooting
| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| Player never ready | IFrame API not yet loaded | Ensure network access; relay retries automatically |
| No events received | Origin mismatch | Verify `appOrigin` & `webOrigin` values match actual origins |
| Commands ignored | Iframe not yet built | Wait for `onReady` before sending commands |
| Video hidden (opacity 0) | Player state not among display states | Trigger play or ensure correct `videoId` |

