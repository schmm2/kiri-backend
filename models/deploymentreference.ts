const mongoose = require('mongoose');
import { createObjectTC } from '../graphql/createObjectTC';
import { ConfigurationTC } from "./configuration";
import { TenantTC } from "./tenant";
import { DeploymentTC } from "./deployment";

const deploymentReferenceSchema = new mongoose.Schema({
    deployment: {
        type: mongoose.Schema.Types.ObjectId,
        require: true
    },
    sourceConfiguration: {
        type: mongoose.Schema.Types.ObjectId,
        require: true
    },
    destinationConfiguration: {
        type: mongoose.Schema.Types.ObjectId,
        require: true
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        require: true
    }
}, {
    timestamps: true
});

export const DeploymentReference = mongoose.models.Deployment || mongoose.model('DeploymentReference', deploymentReferenceSchema);
export const DeploymentReferenceTC = createObjectTC({ model: DeploymentReference, customizationOptions: {} });

DeploymentTC.addRelation(
    'deployment',
    {
        resolver: () => DeploymentTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.deployment,
        },
        projection: { deployment: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTC.addRelation(
    'sourceConfiguration',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.sourceConfiguration,
        },
        projection: { sourceConfiguration: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTC.addRelation(
    'destinationConfiguration',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.destinationConfiguration,
        },
        projection: { destinationConfiguration: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTC.addRelation(
    'tenant',
    {
        resolver: () => TenantTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.tenant,
        },
        projection: { tenant: true }, // point fields in source object, which should be fetched from DB
    }
);
