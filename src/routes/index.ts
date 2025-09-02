import { FastifyInstance } from 'fastify'
import { modelsRoutes } from './models.js'
import { audioGuidesRoutes } from './audioGuides.js'
import { uploadRoutes } from './upload.js'
import { visualizationsRoutes } from './visualizations.js'

export const setupRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(modelsRoutes, { prefix: '/api/models' })
  await fastify.register(audioGuidesRoutes, { prefix: '/api/audio-guides' })
  await fastify.register(uploadRoutes, { prefix: '/api/upload' })
  await fastify.register(visualizationsRoutes, { prefix: '/api/visualizations' })
}