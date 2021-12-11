const mongoose = require('mongoose');
import { createObjectTC } from '../graphql/createObjectTC';
import { ConfigurationTC } from "./configuration";
import { TenantTC } from "./tenant";
import { DeploymentTC } from "./deployment";

const deploymentReferenceSchema = new mongoose.Schema({
    deployment: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    sourceConfiguration: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    destinationConfiguration: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
});

export const DeploymentReference = mongoose.models.DeploymentReference || mongoose.model('DeploymentReference', deploymentReferenceSchema);
export const DeploymentReferenceTC = createObjectTC({ model: DeploymentReference, customizationOptions: {} });

DeploymentReferenceTC.addRelation(
    'deployment',
    {
        resolver: () => DeploymentTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.deployment,
        },
        projection: { deployment: true }, // point fields in source object, which should be fetched from DB
    }
);

DeploymentReferenceTC.addRelation(
    'sourceConfiguration',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.sourceConfiguration,
        },
        projection: { sourceConfiguration: true }, // point fields in source object, which should be fetched from DB
    }
);

DeploymentReferenceTC.addRelation(
    'destinationConfiguration',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.destinationConfiguration,
        },
        projection: { destinationConfiguration: true }, // point fields in source object, which should be fetched from DB
    }
);

DeploymentReferenceTC.addRelation(
    'tenant',
    {
        resolver: () => TenantTC.mongooseResolvers.findById({ lean: true }),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.tenant,
        },
        projection: { tenant: true }, // point fields in source object, which should be fetched from DB
    }
);
