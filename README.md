# Helios-Core

A library containing core mechanisms for Helios Launcher

### Requirements

* Node.js 20 (minimum)

helios-core will always use the same minimum node version as Helios Launcher.

## Auth

### Supported Auth Providers

* Mojang
* Microsoft

### Provider Information

#### Mojang

Mojang authentication makes use of the Yggdrasil scheme. See https://wiki.vg/Authentication

#### Microsoft

Microsoft authentication uses OAuth 2.0 with Azure. See https://wiki.vg/Microsoft_Authentication_Scheme

### macOS ARM64 Compatibility

For older Minecraft versions (< 1.19), this library includes a patch to enable compatibility with Apple Silicon (ARM64) devices. This is accomplished by:

1.  **LWJGL 3.3.x Swap:** The library automatically replaces the outdated LWJGL libraries in older Minecraft versions with the modern LWJGL 3.3.x versions, which include ARM64 natives.
2.  **Patched GLFW Native:** The standard `libglfw.dylib` is replaced with a patched version that resolves a Cocoa window creation error (`GLFW error 65548`), a common cause of crashes on Apple Silicon.

This process is fully automated and requires no user intervention.

### LICENSE

LGPL-3.0