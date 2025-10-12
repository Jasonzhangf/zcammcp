# ZCAM MCP Architecture

## Overview

This document describes the architecture of the ZCAM MCP (Model Context Protocol) server, which provides a standardized interface for controlling Z CAM cameras through the MCP protocol.

## Version History

- 0.0.1: Initial version
- 0.0.2: Updated MCP framework and design documentation. Implementation has not started yet.
- 0.0.3: Implementation started. Core components and services partially implemented.
- 0.2.0: All camera control services implemented with real HTTP requests. Full MCP server implementation completed.

## Architecture Components

### 1. Core Components

#### CameraManager
Manages the collection of Z CAM cameras, including discovery, addition, and listing of cameras.
- Implemented: ✅

#### ContextManager
Manages the current camera context for operations, allowing clients to select which camera to control.
- Implemented: ✅ (as ContextService)

### 2. Service Components

Each service corresponds to a specific aspect of camera functionality:

#### PTZService
Controls Pan-Tilt-Zoom functionality of the cameras.
- Implemented: ✅

#### PresetService
Manages camera position presets (save/recall positions).
- Implemented: ✅

#### ExposureService
Controls exposure settings including aperture, shutter speed, and ISO.
- Implemented: ✅

#### WhiteBalanceService
Manages white balance settings including color temperature and mode.
- Implemented: ✅

#### ImageService
Controls image adjustment settings like brightness, contrast, and saturation.
- Implemented: ✅

#### AutoFramingService
Manages auto framing features of the camera.
- Implemented: ✅

#### VideoService
Handles video related settings.
- Implemented: ✅

#### StreamingService
Manages RTMP streaming functionality.
- Implemented: ✅

#### RecordingService
Controls video recording functionality.
- Implemented: ✅

#### WebSocketSubscriptionManager
Manages WebSocket connections and real-time camera status updates.
- Implemented: ✅

#### PersistenceService
Handles persistent storage of camera contexts and settings.
- Implemented: ✅

### 3. MCP Server

The MCP server acts as the interface between the Z CAM camera services and MCP clients. It translates MCP requests into camera control operations.
- Implemented: ✅

## Design Principles

1. **Modularity**: Each service is独立封装, making it easy to extend or modify specific functionality.
2. **Context Awareness**: All operations are performed in the context of a selected camera.
3. **Standardization**: Follows the MCP protocol specification for consistent client interaction.

## Implementation Status

As of version 0.2.0, all core components and service components have been implemented. The MCP server framework is fully implemented with complete camera management functionality and all camera control services. All services now use real HTTP requests to communicate with Z CAM cameras instead of mock data.

## Next Implementation Priorities

1. Add comprehensive error handling and logging
2. Implement unit tests for all components
3. Add documentation and usage examples