# ImvtCameraService API Reference

**Base URL**: `http://localhost:17988`

## 1. Camera Properties (Brightness, Exposure, Focus, etc.)

**Supported Keys**: `exposure`, `focus`, `zoom`, `pan`, `tilt`, `iris`, `roll`, `brightness`, `contrast`, `saturation`, `sharpness`, `whitebalance`, `gain`, `backlightcompensation`, `hue`, `gamma`.

### Get Property Info
Returns range, step, default, and current value.
- **Command**: `GET /usbvideoctrl?key=<property>`
- **Example**: `GET /usbvideoctrl?key=brightness`

### Set Property Value
Sets the value of a specific property.
- **Command**: `GET /usbvideoctrl?key=<property>&value=<value>`
- **Optional**: Add `&auto=true` to enable auto mode (if supported).
- **Example (Manual)**: `GET /usbvideoctrl?key=brightness&value=128`
- **Example (Auto)**: `GET /usbvideoctrl?key=exposure&auto=true`

## 2. Resolution & Frame Rate

### Resolution
- **Get List**: `GET /usbvideoctrl?key=resolutions`
- **Set Resolution**: `GET /usbvideoctrl?key=resolutions&width=<w>&height=<h>`
  - **Example**: `GET /usbvideoctrl?key=resolutions&width=1920&height=1080`

### Frame Rate
- **Get List**: `GET /usbvideoctrl?key=framerates`
- **Set Frame Rate**: `GET /usbvideoctrl?key=framerates&value=<fps>`
  - **Example**: `GET /usbvideoctrl?key=framerates&value=30`

## 3. System & WebSocket
- **Query All Capabilities**: `GET /usbvideoctrl?action=query`
- **WebSocket**: `ws://localhost:17988/ws`
