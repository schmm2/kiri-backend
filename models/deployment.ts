const mongoose = require('mongoose');
import { createObjectTC } from '../graphql/createObjectTC';
import { ConfigurationVersionTC } from "./configurationversion";

const deploymentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    configurationVersions: {
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
    'configurationVersions',
    {
        resolver: () => ConfigurationVersionTC.getResolver("findMany"),
        prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
            _ids: (source) => source.configurationVerions,
        },
        projection: { configurationVersions: 1 }, // point fields in source object, which should be fetched from DB
    }
);
