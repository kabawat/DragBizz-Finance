require('module-alias/register');
const mongoose = require('mongoose');
const { PackageModel } = require('../models');
const { FEATURES, USAGE_TYPES } = require('../constants/features');
const { PACKAGE_STATUS } = require('../constants/enum/package.enum');
const { connectDB } = require('../config/database.config');
const logger = require('../utils/logger');

async function createSevenDayPackage() {
    try {
        await connectDB();
        logger.info('Connected to database');

        const packageName = "7-Day Unlimited Trial";
        const packageSlug = "7-day-unlimited-trial";

        // Check if package already exists
        const existingPackage = await PackageModel.findOne({ slug: packageSlug });
        if (existingPackage) {
            logger.info('Package already exists, updating it...');
        }

        const featureUsageLimits = Object.values(FEATURES).map(featureKey => ({
            featureKey,
            enabled: true,
            usageType: USAGE_TYPES.UNLIMITED,
            highlight: `Unlimited ${featureKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
        }));

        const packageData = {
            name: packageName,
            slug: packageSlug,
            description: "A special 7-day package with unlimited access to all features.",
            shortDescription: "7 Days Unlimited Access",
            planType: 'CUSTOM',
            pricing: [
                {
                    months: 1, // System default, but we'll use trialPeriod for 7 days
                    price: 99,
                    discount: 0,
                    discountedPrice: 0
                }
            ],
            featureUsageLimits,
            status: 'ACTIVE',
            isVisible: true,
            isPopular: false,
            isRecommended: true,
            isAIFeature: true,
            trialPeriod: {
                enabled: true,
                days: 7
            },
            displayOrder: 0
        };

        if (existingPackage) {
            await PackageModel.updateOne({ _id: existingPackage._id }, packageData);
            logger.info('Package updated successfully');
        } else {
            const newPackage = new PackageModel(packageData);
            await newPackage.save();
            logger.info('New 7-day package created successfully');
        }

        mongoose.connection.close();
    } catch (error) {
        logger.error('Error creating 7-day package:', error);
        process.exit(1);
    }
}

createSevenDayPackage();
