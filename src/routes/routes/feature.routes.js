const featureRouter = require('express').Router();
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');
const adminMiddleware = require('@src/middlewares/admin.middleware');
const createFeatureController = require('@src/controllers/feature/create');
const updateFeatureController = require('@src/controllers/feature/update');
const deleteFeatureController = require('@src/controllers/feature/delete');
const getFeatureController = require('@src/controllers/feature/get');

featureRouter.get('/', accessMiddleware, adminMiddleware, getFeatureController);
featureRouter.post('/', accessMiddleware, adminMiddleware, createFeatureController);
featureRouter.put('/:id', accessMiddleware, adminMiddleware, updateFeatureController);
featureRouter.delete('/:id', accessMiddleware, adminMiddleware, deleteFeatureController);

module.exports = featureRouter;

