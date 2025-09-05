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
      const folderPath = `${placeId}_3d`;
      const filename = 'index.htm';
      const fullPath = `${folderPath}/${filename}`;
      const minioUrl = getMinioUrl();

      // Check if the file exists first
      await fastify.minio.statObject(BUCKETS.VISUALIZATIONS, fullPath);

      // Return direct bucket URL
      return reply.send({
        placeId,
        folder: folderPath,
        filename,
        url: `${minioUrl}/${BUCKETS.VISUALIZATIONS}/${fullPath}`
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
        folder: string;
        filename: string;
        size: number;
        lastModified: Date;
        url: string;
      }> = [];

      const minioUrl = getMinioUrl();
      const processedFolders = new Set<string>();

      for await (const obj of objectsStream) {
        if (obj.name && obj.name.endsWith("index.htm") && obj.name.includes("_3d/")) {
          const folderPath = obj.name.split("/")[0];
          
          if (!processedFolders.has(folderPath)) {
            processedFolders.add(folderPath);
            const placeId = folderPath.replace("_3d", "");
            
            visualizations.push({
              placeId,
              folder: folderPath,
              filename: "index.htm",
              size: obj.size,
              lastModified: obj.lastModified,
              url: `${minioUrl}/${BUCKETS.VISUALIZATIONS}/${obj.name}`,
            });
          }
        }
      }

      return { visualizations };
    } catch (error: unknown) {
      fastify.log.error(`Error listing visualizations: ${String(error)}`);
      return reply.status(500).send({ error: "Failed to list visualizations" });
    }
  });
};
