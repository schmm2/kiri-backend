const mongoose = require('mongoose');
import { TenantTC } from '../models/tenant';
import { createObjectTC } from '../graphql/createObjectTC'; 

const configurationSchema = new mongoose.Schema({
    graphIsDeleted: {
        type: Boolean,
        required: true
    },
    graphId: {
        type: String,
        required: true
    },
    graphCreatedAt: {
        type: String,
        required: true
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        require: true
    },
    configurationType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConfigurationType',
        require: true
    },
    configurationVersions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConfigurationVersion'
    }]
}, {
    timestamps: true
});

export const Configuration = mongoose.models.Configuration || mongoose.model('Configuration', configurationSchema);
export const ConfigurationTC = createObjectTC({ model: Configuration, customizationOptions: {} });

ConfigurationTC.addRelation(
    'tenant',
    {
        resolver: () => TenantTC.getResolver("findById"),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.tenant,
        },
        projection: { tenant: true }, // point fields in source object, which should be fetched from DB
    }
);