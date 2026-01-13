const { PackageModel } = require("@src/models");
const mongoose = require("mongoose");

class PackageService {
    // Create a new package
    static async create(packageData, adminId) {
        try {
            // Create package
            const packageDoc = new PackageModel(packageData);
            await packageDoc.save();

            // Populate features for response
            const populatedPackage = await PackageModel.findById(packageDoc._id)
                .lean();

            return populatedPackage;
        } catch (error) {
            throw error;
        }
    }

    // Update package
    static async update(packageId, packageData, adminId) {
        try {
            // Find existing package
            const existingPackage = await PackageModel.findById(packageId);
            if (!existingPackage || existingPackage.deletedAt) {
                throw new Error('Package not found');
            }

            // Update package
            Object.keys(packageData).forEach(key => {
                existingPackage[key] = packageData[key];
            });

            await existingPackage.save();

            // Populate features for response
            const populatedPackage = await PackageModel.findById(existingPackage._id)
                .lean();

            return populatedPackage;
        } catch (error) {
            throw error;
        }
    }

    // Check if package name already exists
    static async nameExists(name, excludeId = null) {
        const query = {
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            deletedAt: null
        };

        if (excludeId) {
            query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
        }

        const exists = await PackageModel.findOne(query).select('_id').lean();
        return !!exists;
    }

    // Hard delete package
    static async delete(packageId, adminId) {
        try {
            const packageDoc = await PackageModel.findById(packageId);
            if (!packageDoc) {
                throw new Error('Package not found');
            }

            await PackageModel.findByIdAndDelete(packageId);
            return { id: packageId };
        } catch (error) {
            throw error;
        }
    }

    // Get single package by ID
    static async getById(packageId) {
        try {
            const packageDoc = await PackageModel.findOne({
                _id: packageId,
                $or: [
                    { deletedAt: null },
                    { deletedAt: { $exists: false } }
                ]
            })
                .select('+metadata') // Include metadata field
                .lean();

            if (!packageDoc) {
                throw new Error('Package not found');
            }

            return packageDoc;
        } catch (error) {
            throw error;
        }
    }

    // Get paginated packages list
    static async getPaginated(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                planType,
                isVisible,
                search,
                sortBy = 'displayOrder',
                sortOrder = 'asc'
            } = options;

            // Validate pagination params
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(Math.max(1, parseInt(limit) || 10), 100); // Max 100 per page
            const skip = (pageNum - 1) * limitNum;

            const query = {
                $or: [
                    { deletedAt: null },
                    { deletedAt: { $exists: false } }
                ]
            };

            // Apply filters only if explicitly provided
            if (status) {
                query.status = status;
            }

            if (planType) {
                query.planType = planType;
            }

            if (isVisible !== undefined && isVisible !== null && isVisible !== '') {
                query.isVisible = isVisible === 'true' || isVisible === true;
            }

            // Search functionality
            if (search) {
                const searchConditions = {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } },
                        { shortDescription: { $regex: search, $options: 'i' } },
                        { tags: { $in: [new RegExp(search, 'i')] } }
                    ]
                };

                // If search is provided, we need to combine it with deletedAt filter
                // Also check if we have other filters that need $and
                const hasOtherFilters = status || planType || (isVisible !== undefined && isVisible !== null && isVisible !== '');
                
                if (hasOtherFilters) {
                    // Combine everything with $and
                    const deletedAtFilter = {
                        $or: [
                            { deletedAt: null },
                            { deletedAt: { $exists: false } }
                        ]
                    };
                    
                    const otherFilters = {};
                    if (status) otherFilters.status = status;
                    if (planType) otherFilters.planType = planType;
                    if (isVisible !== undefined && isVisible !== null && isVisible !== '') {
                        otherFilters.isVisible = isVisible === 'true' || isVisible === true;
                    }

                    query.$and = [
                        deletedAtFilter,
                        searchConditions,
                        otherFilters
                    ];
                    delete query.$or;
                    delete query.status;
                    delete query.planType;
                    delete query.isVisible;
                } else {
                    // Only search, combine with deletedAt using $and
                    query.$and = [
                        {
                            $or: [
                                { deletedAt: null },
                                { deletedAt: { $exists: false } }
                            ]
                        },
                        searchConditions
                    ];
                    delete query.$or;
                }
            }

            // Build sort
            const sort = {};
            const validSortFields = ['displayOrder', 'createdAt', 'name', 'pricing.amount'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'displayOrder';
            sort[sortField] = sortOrder === 'desc' ? -1 : 1;
            sort._id = -1; // Secondary sort for consistency

            const total = await PackageModel.countDocuments(query);

            // Get paginated packages
            const packages = await PackageModel.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean();
            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            return {
                packages,
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

// Export PackageService with named methods
module.exports = PackageService;
