import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
});

const BUCKETS = {
  MODELS: "models",
  AUDIO_GUIDES: "audio-guides",
};

const initializeBuckets = async () => {
  try {
    for (const bucketName of Object.values(BUCKETS)) {
      const exists = await minioClient.bucketExists(bucketName);
      if (!exists) {
        await minioClient.makeBucket(bucketName, "us-east-1");
        console.log(`✅ Created bucket: ${bucketName}`);

        // Set bucket policy to allow public read access
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
          ],
        };

        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log(`✅ Set public read policy for bucket: ${bucketName}`);
      } else {
        console.log(`✅ Bucket already exists: ${bucketName}`);
      }
    }
  } catch (error) {
    console.error("❌ Error initializing buckets:", error);
    throw error;
  }
};

export { minioClient, initializeBuckets, BUCKETS };
