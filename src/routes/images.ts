import { FastifyInstance } from "fastify";
import { BUCKETS } from "../config/minio.js";

interface ImageListParams {
  placeId: string;
}

interface ImageInfo {
  filename: string;
  url: string;
}

interface GroupedImages {
  1: ImageInfo[];
  2: ImageInfo[];
  3: ImageInfo[];
  4: ImageInfo[];
}

const getMinioPublicUrl = (): string => {
  // Use MINIO_PUBLIC_URL if set, otherwise fall back to HOST_URL + /minio or localhost
  const publicUrl = process.env.MINIO_PUBLIC_URL;
  if (publicUrl) {
    return publicUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fall back to HOST_URL + /minio pattern
  const hostUrl = process.env.HOST_URL;
  if (hostUrl && !hostUrl.includes('localhost')) {
    return `${hostUrl.replace(/\/$/, '')}/minio`;
  }
  
  // Development fallback
  return 'http://localhost:9000';
};

const groupImages = (images: ImageInfo[]): GroupedImages => {
  const groups: GroupedImages = { 1: [], 2: [], 3: [], 4: [] };

  if (images.length === 0) return groups;
  if (images.length === 1) return { ...groups, 1: [images[0]] };
  if (images.length === 2) return { ...groups, 1: [images[0]], 4: [images[1]] };

  groups[1] = [images[0]];
  groups[4] = [images[images.length - 1]];

  const middle = images.slice(1, -1);
  const midPoint = Math.ceil(middle.length / 2);
  groups[2] = middle.slice(0, midPoint);
  groups[3] = middle.slice(midPoint);

  return groups;
};

export const imagesRoutes = async (fastify: FastifyInstance) => {

  fastify.get("/debug", async () => {
    try {
      const objects: any[] = [];
      const stream = fastify.minio.listObjects(BUCKETS.IMAGES, "", true);

      for await (const obj of stream) {
        objects.push({ name: obj.name, size: obj.size, lastModified: obj.lastModified });
      }

      return { bucket: BUCKETS.IMAGES, objects };
    } catch (error: unknown) {
      fastify.log.error(`Error listing all objects: ${String(error)}`);
      return { error: String(error) };
    }
  });

  fastify.get<{ Params: ImageListParams }>("/:placeId", async (request) => {
    try {
      const { placeId } = request.params;
      const prefix = `${placeId}/`;
      const images: ImageInfo[] = [];

      const stream = fastify.minio.listObjects(BUCKETS.IMAGES, prefix, false);

      for await (const obj of stream) {
        if (obj.name && obj.name !== prefix) {
          images.push({
            filename: obj.name.replace(prefix, ""),
            url: `${getMinioPublicUrl()}/${BUCKETS.IMAGES}/${obj.name}`,
          });
        }
      }

      const grouped = groupImages(images);
      fastify.log.info(
        `Grouped ${images.length} images for ${placeId}: [${grouped[1].length}, ${grouped[2].length}, ${grouped[3].length}, ${grouped[4].length}]`
      );

      return grouped;
    } catch (error: unknown) {
      fastify.log.error(`Error listing images: ${String(error)}`);
      return { 1: [], 2: [], 3: [], 4: [] } as GroupedImages;
    }
  });
};
