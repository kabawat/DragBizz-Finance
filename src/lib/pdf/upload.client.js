const utilityGrpcClient = require('@src/lib/grpc/clients/utility/utility.client');
const logger = require('@src/utils/logger');

// Upload PDF buffer to R2 via utility service gRPC API
async function uploadPdfToR2(key, pdfBuffer) {
    try {
        const response = await utilityGrpcClient.uploadFile({
            key,
            content: pdfBuffer,
            content_type: 'application/pdf',
        });

        logger.info('[UploadClient] PDF uploaded to R2 via gRPC', { key, bytes: pdfBuffer.length });
        return { key: response?.key || key };
    } catch (error) {
        logger.error('[UploadClient] R2 gRPC upload failed', { key, error: error.message });
        throw new Error(`R2 gRPC upload failed: ${error.message}`);
    }
}

// Get short-lived presigned GET URL for private R2 object via utility service gRPC API
async function getPresignedDownloadUrl(key, expiresIn = 300) {
    try {
        const response = await utilityGrpcClient.getSignedUrl({
            key,
            expires_in: expiresIn,
        });

        const url = response?.url;
        if (!url) throw new Error('No URL returned from utility gRPC service');

        logger.info('[UploadClient] Presigned GET URL obtained via gRPC', { key, expiresIn });
        return url;
    } catch (error) {
        logger.error('[UploadClient] Presigned URL gRPC fetch failed', { key, error: error.message });
        throw new Error(`Presigned URL gRPC fetch failed: ${error.message}`);
    }
}

module.exports = { uploadPdfToR2, getPresignedDownloadUrl };
