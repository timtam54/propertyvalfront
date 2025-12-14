/**
 * Migration script to move base64 images from MongoDB to Azure Blob Storage
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Finds all properties with base64 images
 * 3. Uploads each image to Azure Blob Storage
 * 4. Updates the property with Azure URLs
 * 5. Removes the base64 data from the database
 *
 * Run with: node scripts/migrate-images-to-azure.js
 */

const { MongoClient } = require('mongodb');
const { BlobServiceClient } = require('@azure/storage-blob');

// Configuration from environment
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://timhams_db_user:yOmQ93Va5rNApCj8@propertval.24nnjau.mongodb.net/property_app?retryWrites=true&w=majority';
const DB_NAME = process.env.DB_NAME || 'property_app';
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || 'DefaultEndpointsProtocol=https;AccountName=eonevalblob;AccountKey=UPd0K5wu18zNTeDgfk/glJ98aSUj4Quv+2s7cdcNj6GIswBmKLtXSStq/T9CG78jC0qTSrG6VxIZ+AStI/Dg8g==;EndpointSuffix=core.windows.net';
const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'eonevalblob';

// Helper to detect base64 images
function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image/');
}

// Helper to extract mime type and data from base64 string
function parseBase64Image(base64String) {
  const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;

  return {
    mimeType: matches[1],
    data: matches[2],
    extension: matches[1].split('/')[1] || 'jpg'
  };
}

async function migrateImages() {
  console.log('Starting image migration to Azure Blob Storage...\n');

  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  const propertiesCollection = db.collection('properties');

  // Connect to Azure Blob Storage
  console.log('Connecting to Azure Blob Storage...');
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

  // Ensure container exists with public access
  await containerClient.createIfNotExists({ access: 'blob' });
  console.log(`Using container: ${AZURE_CONTAINER_NAME}\n`);

  // Find all properties
  const properties = await propertiesCollection.find({}).toArray();
  console.log(`Found ${properties.length} properties to check\n`);

  let totalImagesUploaded = 0;
  let totalPropertiesUpdated = 0;
  let totalBytesSaved = 0;

  for (const property of properties) {
    if (!property.images || property.images.length === 0) {
      continue;
    }

    // Check if any images are base64
    const base64Images = property.images.filter(isBase64Image);
    if (base64Images.length === 0) {
      console.log(`Property ${property.id}: No base64 images (${property.images.length} URL images)`);
      continue;
    }

    console.log(`\nProperty ${property.id} (${property.location?.substring(0, 40)}...):`);
    console.log(`  Found ${base64Images.length} base64 images to migrate`);

    const newImages = [];
    let propertyBytesSaved = 0;

    for (let i = 0; i < property.images.length; i++) {
      const image = property.images[i];

      if (!isBase64Image(image)) {
        // Already a URL, keep it
        newImages.push(image);
        continue;
      }

      const parsed = parseBase64Image(image);
      if (!parsed) {
        console.log(`  Image ${i + 1}: Failed to parse, skipping`);
        newImages.push(image);
        continue;
      }

      // Track bytes saved
      propertyBytesSaved += image.length;

      // Generate unique blob name
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const blobName = `${property.id}-${timestamp}-${randomId}.${parsed.extension}`;

      try {
        // Upload to Azure
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const buffer = Buffer.from(parsed.data, 'base64');

        await blockBlobClient.uploadData(buffer, {
          blobHTTPHeaders: {
            blobContentType: parsed.mimeType,
          },
        });

        // Get the public URL
        const azureUrl = blockBlobClient.url;
        newImages.push(azureUrl);
        totalImagesUploaded++;

        console.log(`  Image ${i + 1}: Uploaded to Azure (${(buffer.length / 1024).toFixed(1)} KB)`);
      } catch (error) {
        console.error(`  Image ${i + 1}: Upload failed - ${error.message}`);
        // Keep original base64 if upload fails
        newImages.push(image);
        propertyBytesSaved -= image.length; // Don't count as saved
      }
    }

    // Update property in database
    if (newImages.some((img, idx) => img !== property.images[idx])) {
      await propertiesCollection.updateOne(
        { id: property.id },
        { $set: { images: newImages } }
      );
      totalPropertiesUpdated++;
      totalBytesSaved += propertyBytesSaved;
      console.log(`  Updated property in database`);
    }
  }

  // Close connections
  await mongoClient.close();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Migration Complete!');
  console.log('='.repeat(50));
  console.log(`Properties updated: ${totalPropertiesUpdated}`);
  console.log(`Images uploaded to Azure: ${totalImagesUploaded}`);
  console.log(`Database size reduced by: ${(totalBytesSaved / 1024 / 1024).toFixed(2)} MB`);
}

// Run migration
migrateImages()
  .then(() => {
    console.log('\nMigration finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
