const mongoose = require('mongoose');
const packageSchema = require('./schema/package.schema');
const featureSchema = require('./schema/feature.schema');

const PackageModel = mongoose.model("Package", packageSchema);
const FeatureModel = mongoose.model("Feature", featureSchema);

const Models = {
    PackageModel,
    FeatureModel
};

module.exports = Models;

