import { FastifyInstance } from 'fastify'
import { imagesRoutes } from './images.js'

export const setupRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(imagesRoutes, { prefix: '/api/images' })
}