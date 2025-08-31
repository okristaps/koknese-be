# Koknese Backend API

Backend API for serving 3D models (.glb) and audio guide files using Fastify, TypeScript, and MinIO S3-compatible storage.

## Features

- 📁 File storage with MinIO S3-compatible object storage
- 🎵 Audio guide streaming and download (MP3, WAV, OGG, M4A)
- 🎨 3D model serving (.glb files)
- 📤 File upload endpoints
- 🐳 Docker containerized setup
- ⚡ Fast API with Fastify and TypeScript
- 📦 Package management with pnpm

## Quick Start

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the API:**
   - API: http://localhost:3001
   - MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)

## API Endpoints

### Health Check
- `GET /health` - API health status

### 3D Models
- `GET /api/models` - List all available .glb models
- `GET /api/models/stream/:filename` - Stream a 3D model
- `GET /api/models/download/:filename` - Download a 3D model
- `POST /api/upload/model` - Upload a new .glb model
- `DELETE /api/upload/model/:filename` - Delete a model

### Audio Guides
- `GET /api/audio-guides` - List all available audio guides
- `GET /api/audio-guides/stream/:filename` - Stream an audio guide
- `GET /api/audio-guides/download/:filename` - Download an audio guide
- `POST /api/upload/audio-guide` - Upload a new audio guide
- `DELETE /api/upload/audio-guide/:filename` - Delete an audio guide

## Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development server:**
   ```bash
   pnpm dev
   ```

3. **Build for production:**
   ```bash
   pnpm build
   ```

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```