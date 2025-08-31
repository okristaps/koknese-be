import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BUCKETS } from '../config/minio.js'

interface DeleteParams {
  filename: string
}

export const uploadRoutes = async (fastify: FastifyInstance) => {
  // Upload a 3D model
  fastify.post('/model', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' })
      }
      
      if (!data.filename.endsWith('.glb')) {
        return reply.status(400).send({ error: 'Only .glb files are allowed' })
      }

      const buffer = await data.toBuffer()
      
      await fastify.minio.putObject(
        BUCKETS.MODELS,
        data.filename,
        buffer,
        buffer.length,
        {
          'Content-Type': 'model/gltf-binary',
          'x-amz-meta-uploaded-at': new Date().toISOString()
        }
      )

      return {
        message: 'Model uploaded successfully',
        filename: data.filename,
        size: buffer.length,
        url: `/api/models/stream/${encodeURIComponent(data.filename)}`
      }
    } catch (error: unknown) {
      fastify.log.error(`Error uploading model: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to upload model' })
    }
  })

  // Upload an audio guide
  fastify.post('/audio-guide', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' })
      }
      
      if (!data.filename.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        return reply.status(400).send({ error: 'Only audio files (mp3, wav, ogg, m4a) are allowed' })
      }

      const buffer = await data.toBuffer()
      
      const contentTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4'
      }
      
      const extension = data.filename.toLowerCase().match(/\.\w+$/)?.[0]
      const contentType = (extension && contentTypes[extension]) || 'audio/mpeg'
      
      await fastify.minio.putObject(
        BUCKETS.AUDIO_GUIDES,
        data.filename,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
          'x-amz-meta-uploaded-at': new Date().toISOString()
        }
      )

      return {
        message: 'Audio guide uploaded successfully',
        filename: data.filename,
        size: buffer.length,
        url: `/api/audio-guides/stream/${encodeURIComponent(data.filename)}`
      }
    } catch (error: unknown) {
      fastify.log.error(`Error uploading audio guide: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to upload audio guide' })
    }
  })

  // Delete a model
  fastify.delete('/model/:filename', async (request: FastifyRequest<{ Params: DeleteParams }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      
      await fastify.minio.removeObject(BUCKETS.MODELS, filename)
      
      return { message: 'Model deleted successfully', filename }
    } catch (error: unknown) {
      if ((error as any).code === 'NoSuchKey') {
        return reply.status(404).send({ error: 'Model not found' })
      }
      
      fastify.log.error(`Error deleting model: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to delete model' })
    }
  })

  // Delete an audio guide
  fastify.delete('/audio-guide/:filename', async (request: FastifyRequest<{ Params: DeleteParams }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      
      await fastify.minio.removeObject(BUCKETS.AUDIO_GUIDES, filename)
      
      return { message: 'Audio guide deleted successfully', filename }
    } catch (error: unknown) {
      if ((error as any).code === 'NoSuchKey') {
        return reply.status(404).send({ error: 'Audio guide not found' })
      }
      
      fastify.log.error(`Error deleting audio guide: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to delete audio guide' })
    }
  })
}