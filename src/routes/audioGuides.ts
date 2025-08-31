import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BUCKETS } from '../config/minio.js'

interface AudioGuideParams {
  filename: string
}

export const audioGuidesRoutes = async (fastify: FastifyInstance) => {
  // Get all available audio guides
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const objectsStream = fastify.minio.listObjects(BUCKETS.AUDIO_GUIDES, '', true)
      const audioGuides: Array<{
        name: string;
        size: number;
        lastModified: Date;
        url: string;
      }> = []
      
      for await (const obj of objectsStream) {
        if (obj.name && obj.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
          audioGuides.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: `/api/audio-guides/stream/${encodeURIComponent(obj.name)}`
          })
        }
      }
      
      return { audioGuides }
    } catch (error: unknown) {
      fastify.log.error(`Error listing audio guides: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to list audio guides' })
    }
  })

  // Stream an audio guide
  fastify.get('/stream/:filename', async (request: FastifyRequest<{ Params: AudioGuideParams }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      
      if (!filename.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        return reply.status(400).send({ error: 'Only audio files are allowed' })
      }

      const objectStat = await fastify.minio.statObject(BUCKETS.AUDIO_GUIDES, filename)
      const objectStream = await fastify.minio.getObject(BUCKETS.AUDIO_GUIDES, filename)
      
      // Set appropriate content type based on file extension
      const contentTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4'
      }
      
      const extension = filename.toLowerCase().match(/\.\w+$/)?.[0]
      const contentType = (extension && contentTypes[extension]) || 'audio/mpeg'
      
      reply.header('Content-Type', contentType)
      reply.header('Content-Length', objectStat.size)
      reply.header('Accept-Ranges', 'bytes')
      reply.header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
      
      return reply.send(objectStream)
    } catch (error: unknown) {
      if ((error as any).code === 'NoSuchKey') {
        return reply.status(404).send({ error: 'Audio guide not found' })
      }
      
      fastify.log.error(`Error streaming audio guide: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to stream audio guide' })
    }
  })

  // Download an audio guide
  fastify.get('/download/:filename', async (request: FastifyRequest<{ Params: AudioGuideParams }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params
      
      if (!filename.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        return reply.status(400).send({ error: 'Only audio files are allowed' })
      }

      const objectStream = await fastify.minio.getObject(BUCKETS.AUDIO_GUIDES, filename)
      
      const contentTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4'
      }
      
      const extension = filename.toLowerCase().match(/\.\w+$/)?.[0]
      const contentType = (extension && contentTypes[extension]) || 'audio/mpeg'
      
      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return reply.send(objectStream)
    } catch (error: unknown) {
      if ((error as any).code === 'NoSuchKey') {
        return reply.status(404).send({ error: 'Audio guide not found' })
      }
      
      fastify.log.error(`Error downloading audio guide: ${String(error)}`)
      return reply.status(500).send({ error: 'Failed to download audio guide' })
    }
  })
}