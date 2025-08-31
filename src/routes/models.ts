import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BUCKETS } from '../config/minio.js'

interface ModelParams {
  filename: string
}

export const modelsRoutes = async (fastify: FastifyInstance) => {
  // Get all available 3D models
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const objectsStream = fastify.minio.listObjects(BUCKETS.MODELS, '', true)
      const models: Array<{
        name: string;
        size: number;
        lastModified: Date;
        url: string;
      }> = []
      
      for await (const obj of objectsStream) {
        if (obj.name && obj.name.endsWith('.glb')) {
          models.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: `/api/models/download/${encodeURIComponent(obj.name)}`
          })
        }
      }
      
      return { models }
    } catch (error: unknown) {
      fastify.log.error(`Error listing models: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to list models' })
    }
  })

  // Download a specific 3D model
  fastify.get('/download/:filename', async (request: FastifyRequest<{ Params: ModelParams }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      
      if (!filename.endsWith('.glb')) {
        return reply.status(400).send({ error: 'Only .glb files are allowed' })
      }

      const objectStream = await fastify.minio.getObject(BUCKETS.MODELS, filename)
      
      reply.header('Content-Type', 'model/gltf-binary')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return reply.send(objectStream)
    } catch (error: unknown) {
      if ((error as any).code === 'NoSuchKey') {
        return reply.status(404).send({ error: 'Model not found' })
      }
      
      fastify.log.error(`Error downloading model: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to download model' })
    }
  })

  // Stream a 3D model (for web viewing)
  fastify.get('/stream/:filename', async (request: FastifyRequest<{ Params: ModelParams }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      
      if (!filename.endsWith('.glb')) {
        return reply.status(400).send({ error: 'Only .glb files are allowed' })
      }

      const objectStream = await fastify.minio.getObject(BUCKETS.MODELS, filename)
      
      reply.header('Content-Type', 'model/gltf-binary')
      reply.header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
      
      return reply.send(objectStream)
    } catch (error: unknown) {
      if ((error as any).code === 'NoSuchKey') {
        return reply.status(404).send({ error: 'Model not found' })
      }
      
      fastify.log.error(`Error streaming model: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to stream model' })
    }
  })
}