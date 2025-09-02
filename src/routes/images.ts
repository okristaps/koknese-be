import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BUCKETS } from "../config/minio.js";

interface ImageListParams {
  placeId: string;
}

interface ImageParams {
  placeId: string;
  filename: string;
}

export const imagesRoutes = async (fastify: FastifyInstance) => {
  // Debug endpoint to see all objects in images bucket
  fastify.get("/debug", async (request, reply) => {
    try {
      const objects: any[] = [];
      const stream = fastify.minio.listObjects(BUCKETS.IMAGES, "", true);

      for await (const obj of stream) {
        objects.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
        });
      }

      return { bucket: BUCKETS.IMAGES, objects };
    } catch (error: unknown) {
      fastify.log.error(`Error listing all objects: ${String(error)}`);
      return { error: String(error) };
    }
  });

  // Get list of images for a place
  fastify.get<{ Params: ImageListParams }>("/:placeId", async (request, reply) => {
    try {
      const { placeId } = request.params;
      const objects: any[] = [];
      const prefix = placeId + "/";

      fastify.log.info(`Listing objects with prefix: ${prefix}`);
      const stream = fastify.minio.listObjects(BUCKETS.IMAGES, prefix, false);

      for await (const obj of stream) {
        fastify.log.info(`Found object: ${obj.name}`);
        if (obj.name && obj.name !== prefix) {
          const filename = obj.name.replace(prefix, "");
          objects.push({
            filename,
            url: `/api/images/${placeId}/${filename}`,
          });
        }
      }

      fastify.log.info(`Returning ${objects.length} images`);
      return objects;
    } catch (error: unknown) {
      fastify.log.error(`Error listing images: ${String(error)}`);
      return [];
    }
  });

  // Serve individual image
  fastify.get<{ Params: ImageParams }>(
    "/:placeId/:filename",
    async (request: FastifyRequest<{ Params: ImageParams }>, reply: FastifyReply) => {
      try {
        const { placeId, filename } = request.params;
        const objectName = `${placeId}/${filename}`;

        // Get object info first for better error handling and headers
        const stat = await fastify.minio.statObject(BUCKETS.IMAGES, objectName);

        // Set aggressive caching headers
        reply.header("Cache-Control", "public, max-age=31536000, immutable"); // 1 year
        reply.header("ETag", stat.etag);
        reply.header("Last-Modified", stat.lastModified.toUTCString());

        // Check if client has cached version
        const ifNoneMatch = request.headers["if-none-match"];
        if (ifNoneMatch === stat.etag) {
          return reply.code(304).send();
        }

        const stream = await fastify.minio.getObject(BUCKETS.IMAGES, objectName);

        // Set content type
        const contentType = stat.metaData["content-type"] || "image/jpeg";
        reply.type(contentType);
        reply.header("Content-Length", stat.size.toString());

        return reply.send(stream);
      } catch (error: unknown) {
        if ((error as any).code === "NoSuchKey") {
          return reply.code(404).send({ error: "Image not found" });
        }
        fastify.log.error(`Error serving image: ${String(error)}`);
        return reply.code(500).send({ error: "Failed to serve image" });
      }
    }
  );
};
