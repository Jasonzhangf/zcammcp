# ZCAM MCP Architecture

## Overview

This document describes the architecture of the ZCAM MCP (Model Context Protocol) server, which provides a standardized interface for controlling Z CAM cameras through the MCP protocol.

## Version History

- 0.0.1: Initial version
- 0.0.2: Updated MCP framework and design documentation. Implementation has not started yet.

## Architecture Components

### 1. Core Components

#### CameraManager
Manages the collection of Z CAM cameras, including discovery, addition, and listing of cameras.

#### ContextManager
Manages the current camera context for operations, allowing clients to select which camera to control.

### 2. Service Components

Each service corresponds to a specific aspect of camera functionality:

#### PTZService
Controls Pan-Tilt-Zoom functionality of the cameras.

#### PresetService
Manages camera position presets (save/recall positions).

#### ExposureService
Controls exposure settings including aperture, shutter speed, and ISO.

#### WhiteBalanceService
Manages white balance settings including color temperature and mode.

#### ImageService
Controls image adjustment settings like brightness, contrast, and saturation.

#### AutoFramingService
Manages auto framing features of the camera.

#### VideoService
Handles video related settings.

#### StreamingService
Manages RTMP streaming functionality.

#### RecordingService
Controls video recording functionality.

### 3. MCP Server

The MCP server acts as the interface between the Z CAM camera services and MCP clients. It translates MCP requests into camera control operations.

## Design Principles

1. **Modularity**: Each service is独立封装, making it easy to extend or modify specific functionality.
2. **Context Awareness**: All operations are performed in the context of a selected camera.
3. **Standardization**: Follows the MCP protocol specification for consistent client interaction.

## Implementation Status

As of version 0.0.2, the MCP framework and design documentation have been updated, but implementation has not started yet.