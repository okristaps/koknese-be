import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { BUCKETS } from "../config/minio.js";

interface VisualizationParams {
  placeId: string;
}

export const visualizationsRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/:placeId", async (request: FastifyRequest<{ Params: VisualizationParams }>, reply: FastifyReply) => {
    try {
      const { placeId } = request.params;
      const filename = `${placeId}.html`;

      const objectStream = await fastify.minio.getObject(BUCKETS.VISUALIZATIONS, filename);

      reply.header("Content-Type", "text/html; charset=utf-8");
      reply.header("Cache-Control", "public, max-age=3600");

      return reply.send(objectStream);
    } catch (error: unknown) {
      if ((error as any).code === "NoSuchKey") {
        return reply.status(404).send({ error: `Visualization not found for place: ${request.params.placeId}` });
      }

      fastify.log.error(`Error serving visualization: ${String(error)}`);
      return reply.status(500).send({ error: "Failed to serve visualization" });
    }
  });

  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const objectsStream = fastify.minio.listObjects(BUCKETS.VISUALIZATIONS, "", true);
      const visualizations: Array<{
        placeId: string;
        filename: string;
        size: number;
        lastModified: Date;
        url: string;
      }> = [];

      for await (const obj of objectsStream) {
        if (obj.name && obj.name.endsWith(".html")) {
          const placeId = obj.name.replace(".html", "");
          visualizations.push({
            placeId,
            filename: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: `/api/visualizations/${encodeURIComponent(placeId)}`,
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
