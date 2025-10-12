# Service Components

This directory contains service components that handle specific aspects of camera functionality.

## Components

### PTZService.ts
Controls Pan-Tilt-Zoom functionality of the cameras, including movement and zoom operations.

### PresetService.ts
Manages camera position presets, allowing users to save and recall camera positions.

### ExposureService.ts
Controls exposure settings including aperture, shutter speed, and ISO.

### WhiteBalanceService.ts
Manages white balance settings including color temperature and mode.

### ImageService.ts
Controls image adjustment settings like brightness, contrast, and saturation.

### AutoFramingService.ts
Manages auto framing features of the camera.

### VideoService.ts
Handles video related settings such as resolution, frame rate, and codec.

### StreamingService.ts
Manages RTMP streaming functionality, including enabling/disabling streaming and setting RTMP URLs.

### RecordingService.ts
Controls video recording functionality, including starting/stopping recording and setting recording formats.

### CameraService.ts
Provides general camera services and acts as a central point for camera operations.

### ContextService.ts
Manages camera contexts and handles context switching between different cameras.

### PersistenceService.ts
Handles persistent storage of camera contexts, settings, and configurations.

### WebSocketSubscriptionManager.ts
Manages WebSocket connections and real-time camera status updates.