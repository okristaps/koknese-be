import Fastify from 'fastify'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import multipart from '@fastify/multipart'
import httpProxy from '@fastify/http-proxy'
import { Client } from 'minio'
import { minioClient, initializeBuckets } from './config/minio.js'
import { setupRoutes } from './routes/index.js'

declare module 'fastify' {
  interface FastifyInstance {
    minio: Client
  }
}

const fastify = Fastify({
  logger: true
})

const start = async () => {
  try {
    await fastify.register(cors, {
      origin: [
        'https://koknese-ar.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })

    // Add compression (gzip/brotli) - this will reduce 120MB significantly
    await fastify.register(compress, {
      global: true,
      threshold: 1024, // Only compress files larger than 1KB
    })

    await fastify.register(multipart)

    // Proxy MinIO console
    await fastify.register(httpProxy, {
      upstream: 'http://localhost:9001',
      prefix: '/console',
      rewritePrefix: '/',
      websocket: true
    })

    fastify.decorate('minio', minioClient)

    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    await setupRoutes(fastify)

    await initializeBuckets()
    console.log('✅ MinIO buckets initialized')
    
    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    console.log(`🚀 Server running on http://0.0.0.0:${port} (accessible at http://localhost:${port})`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()