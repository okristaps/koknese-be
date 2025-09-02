import Fastify from 'fastify'
import cors from '@fastify/cors'
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
      origin: true,
      credentials: true
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