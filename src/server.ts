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
      origin: (origin, callback) => {
        // Allow all Vercel deployments and localhost
        const allowedOrigins = [
          /https:\/\/.*\.vercel\.app$/,  // All Vercel deployments
          /^http:\/\/localhost:\d+$/,    // Localhost with any port
          /^http:\/\/127\.0\.0\.1:\d+$/ // 127.0.0.1 with any port
        ];
        
        // Allow requests without origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
        
        if (isAllowed) {
          callback(null, true);
        } else {
          console.log('CORS blocked origin:', origin);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
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