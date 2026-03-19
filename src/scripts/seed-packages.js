require('module-alias/register');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { PackageModel } = require('../models');
const { connectDB } = require('../config/database.config');
const logger = require('../utils/logger');

async function seedPackages() {
    try {
        await connectDB();
        logger.info('Connected to database for inserting packages');

        // Path to JSON file
        const dataPath = path.join(__dirname, 'packages.json');

        // Read file
        const jsonContent = fs.readFileSync(dataPath, { encoding: 'utf-8' });
        const packages = JSON.parse(jsonContent);

        let insertedCount = 0;
        let updatedCount = 0;

        for (const pkg of packages) {
            // Slug is generated from name, but let's derive it manually for finding
            const expectedSlug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const existingPackage = await PackageModel.findOne({
                $or: [{ name: pkg.name }, { slug: expectedSlug }]
            });

            if (existingPackage) {
                // Update
                logger.info(`Updating existing package: ${pkg.name}`);
                await PackageModel.updateOne({ _id: existingPackage._id }, pkg);
                updatedCount++;
            } else {
                // Create
                logger.info(`Inserting new package: ${pkg.name}`);
                const newPackage = new PackageModel(pkg);
                await newPackage.save();
                insertedCount++;
            }
        }

        logger.info(`Seeding Completed! Total Updated: ${updatedCount}, Total Inserted: ${insertedCount}`);

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('Error seeding packages:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}

seedPackages();
