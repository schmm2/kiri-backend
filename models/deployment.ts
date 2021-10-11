const mongoose = require('mongoose');
import { createObjectTC } from '../graphql/createObjectTC';

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