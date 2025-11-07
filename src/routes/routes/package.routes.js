const packageRouter = require('express').Router();
const createPackageController = require('@src/controllers/package/create');
const updatePackageController = require('@src/controllers/package/update');
const deletePackageController = require('@src/controllers/package/delete');
const getPackageController = require('@src/controllers/package/get');

packageRouter.get('/', getPackageController);
packageRouter.post('/', adminMiddleware, createPackageController);
packageRouter.put('/:id', adminMiddleware, updatePackageController);
packageRouter.delete('/:id', adminMiddleware, deletePackageController);

module.exports = packageRouter;