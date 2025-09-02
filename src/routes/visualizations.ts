import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { BUCKETS } from "../config/minio.js";

interface VisualizationParams {
  placeId: string;
}

export const visualizationsRoutes = async (fastify: FastifyInstance) => {
  // Get MinIO bucket URL - construct from environment or use default
  const getMinioUrl = () => {
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost'
    const port = process.env.MINIO_PORT || '9000'
    const useSSL = process.env.MINIO_USE_SSL === 'true'
    const protocol = useSSL ? 'https' : 'http'
    
    // If it's localhost, include port, otherwise assume it's a domain
    if (endpoint === 'localhost' || endpoint === '127.0.0.1') {
      return `${protocol}://${endpoint}:${port}`
    }
    return `${protocol}://${endpoint}`
  }

  // Get direct URL to visualization for a specific place
  fastify.get("/:placeId", async (request: FastifyRequest<{ Params: VisualizationParams }>, reply: FastifyReply) => {
    try {
      const { placeId } = request.params;
      const filename = `${placeId}.html`;
      const minioUrl = getMinioUrl();

      // Check if the file exists first
      await fastify.minio.statObject(BUCKETS.VISUALIZATIONS, filename);

      // Return direct bucket URL
      return reply.send({
        placeId,
        filename,
        url: `${minioUrl}/${BUCKETS.VISUALIZATIONS}/${filename}`
      });
    } catch (error: unknown) {
      if ((error as any).code === "NoSuchKey") {
        return reply.status(404).send({ error: `Visualization not found for place: ${request.params.placeId}` });
      }

      fastify.log.error(`Error getting visualization: ${String(error)}`);
      return reply.status(500).send({ error: "Failed to get visualization" });
    }
  });

  fastify.get("/", async (request, reply: FastifyReply) => {
    try {
      const objectsStream = fastify.minio.listObjects(BUCKETS.VISUALIZATIONS, "", true);
      const visualizations: Array<{
        placeId: string;
        filename: string;
        size: number;
        lastModified: Date;
        url: string;
      }> = [];

      const minioUrl = getMinioUrl();

      for await (const obj of objectsStream) {
        if (obj.name && obj.name.endsWith(".html")) {
          const placeId = obj.name.replace(".html", "");
          visualizations.push({
            placeId,
            filename: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: `${minioUrl}/${BUCKETS.VISUALIZATIONS}/${obj.name}`,
          });
        }
      }

      return { visualizations };
    } catch (error: unknown) {
      fastify.log.error(`Error listing visualizations: ${String(error)}`);
      return reply.status(500).send({ error: "Failed to list visualizations" });
    }
  });
};
