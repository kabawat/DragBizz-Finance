const mongoose = require('mongoose');
const { PackageModel } = require('./src/models');
const SECRET = require('./src/config/env.config');

mongoose.connect(SECRET.mongo.uri)
  .then(async () => {
    const packages = await PackageModel.find().select('name planType pricing status').lean();
    console.log(JSON.stringify(packages, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
