const mongoose = require('mongoose');
import { createObjectTC } from '../graphql/createObjectTC';
import { ConfigurationTC } from "./configuration";
import { TenantTC } from "./tenant";

const deploymentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    configurations: {
        type: [mongoose.Schema.Types.ObjectId],
        require: false,
        default: []
    },
    tenants: {
        type: [mongoose.Schema.Types.ObjectId],
        require: false,
        default: []
    }
}, {
    timestamps: true
});

export const Deployment = mongoose.models.Deployment || mongoose.model('Deployment', deploymentSchema);
export const DeploymentTC = createObjectTC({ model: Deployment, customizationOptions: {} });

DeploymentTC.addRelation(
    'configurations',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.findByIds(),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _ids: (source) => source.configurations,
        },
        projection: { configurations: 1 }, // point fields in source object, which should be fetched from DB
    }
);

DeploymentTC.addRelation(
    'tenants',
    {
        resolver: () => TenantTC.mongooseResolvers.findByIds(),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _ids: (source) => source.tenants,
        },
        projection: { tenants: 1 }, // point fields in source object, which should be fetched from DB
    }
);
