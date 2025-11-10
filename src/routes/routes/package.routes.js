const packageRouter = require('express').Router();
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');
const adminMiddleware = require('@src/middlewares/admin.middleware');
const createPackageController = require('@src/controllers/package/create');
const updatePackageController = require('@src/controllers/package/update');
const deletePackageController = require('@src/controllers/package/delete');
const getPackageController = require('@src/controllers/package/get');

packageRouter.get('/', getPackageController);
packageRouter.post('/', accessMiddleware, adminMiddleware, createPackageController);
packageRouter.put('/:id', accessMiddleware, adminMiddleware, updatePackageController);
packageRouter.delete('/:id', accessMiddleware, adminMiddleware, deletePackageController);

module.exports = packageRouter;