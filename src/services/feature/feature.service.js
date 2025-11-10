const { FeatureModel } = require("@src/models");
const mongoose = require("mongoose");

class FeatureService {
    // Create a new feature
    static async create(featureData, adminId) {
        try {
            // Create feature
            const featureDoc = new FeatureModel(featureData);
            await featureDoc.save();

            return featureDoc.toObject();
        } catch (error) {
            throw error;
        }
    }

    // Update feature
    static async update(featureId, featureData, adminId) {
        try {
            // Find existing feature
            const existingFeature = await FeatureModel.findById(featureId);
            if (!existingFeature || existingFeature.deletedAt) {
                throw new Error('Feature not found');
            }

            // Update feature
            Object.keys(featureData).forEach(key => {
                existingFeature[key] = featureData[key];
            });

            await existingFeature.save();

            return existingFeature.toObject();
        } catch (error) {
            throw error;
        }
    }

    // Check if feature name already exists
    static async nameExists(name, excludeId = null) {
        const query = {
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            deletedAt: null
        };

        if (excludeId) {
            query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
        }

        const exists = await FeatureModel.findOne(query).select('_id').lean();
        return !!exists;
    }

    // Delete feature (soft delete)
    static async delete(featureId, adminId) {
        try {
            const featureDoc = await FeatureModel.findById(featureId);
            if (!featureDoc) {
                throw new Error('Feature not found');
            }

            featureDoc.deletedAt = new Date();
            await featureDoc.save();

            return { id: featureId };
        } catch (error) {
            throw error;
        }
    }

    // Get single feature by ID
    static async getById(featureId) {
        try {
            const featureDoc = await FeatureModel.findOne({
                _id: featureId,
                $or: [
                    { deletedAt: null },
                    { deletedAt: { $exists: false } }
                ]
            }).lean();

            if (!featureDoc) {
                throw new Error('Feature not found');
            }

            return featureDoc;
        } catch (error) {
            throw error;
        }
    }

    // Get paginated features list
    static async getPaginated(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                category = '',
                isActive = '',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            // Build query
            const query = {
                $or: [
                    { deletedAt: null },
                    { deletedAt: { $exists: false } }
                ]
            };

            // Search filter
            if (search && search.trim()) {
                query.$text = { $search: search.trim() };
            }

            // Category filter
            if (category && category.trim()) {
                query.category = { $regex: new RegExp(category.trim(), 'i') };
            }

            // Active filter
            if (isActive !== undefined && isActive !== null && isActive !== '') {
                query.isActive = isActive === 'true' || isActive === true;
            }

            // Build sort
            const sort = {};
            const validSortFields = ['name', 'category', 'createdAt', 'isActive'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
            sort[sortField] = sortOrder === 'desc' ? -1 : 1;
            sort._id = -1; // Secondary sort for consistency

            // Get total count for pagination
            const total = await FeatureModel.countDocuments(query);

            // Get paginated features
            const features = await FeatureModel.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean();

            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            return {
                features,
                pagination: {
                    currentPage: pageNum,
                    limit: limitNum,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPrevPage
                }
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = FeatureService;

