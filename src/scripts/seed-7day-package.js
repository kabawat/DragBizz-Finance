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

        const { PACKAGE_MODULES } = require('../constants/enum/package.enum');
        const features = PACKAGE_MODULES.map(module => ({
            module: module,
            report: true,
            analytics: true,
            usageType: 'UNLIMITED',
            usageLimit: null,
            customDailyLimit: null
        }));

        const highlights = [
            "Unlimited Store & Inventory Control",
            "Professional Billing & Invoices",
            "Unified Customer & Supplier Tracking",
            "Advanced Financial & Expense Tracking",
            "Efficient Purchase & Bill Management",
            "Full Access to Voice AI Features"
        ];

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
                    discountedPrice: 99
                }
            ],
            features: features,
            highlights,
            status: 'ACTIVE',
            isVisible: true,
            isPopular: false,
            isRecommended: true,
            displayOrder: 0,
            metadata: {
                trialPeriod: {
                    enabled: true,
                    days: 7
                },
                isAIFeature: true
            }
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
