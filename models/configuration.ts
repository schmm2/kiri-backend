const mongoose = require('mongoose');
import { TenantTC } from '../models/tenant';
import { ConfigurationVersionTC } from '../models/configurationversion';
import { ConfigurationTypeTC } from '../models/configurationtype';
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
    }
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

ConfigurationTC.addRelation(
    'configurationType',
    {
        resolver: () => ConfigurationTypeTC.getResolver("findById"),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.configurationType,
        },
        projection: { configurationType: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTC.addRelation(
    'configurationVersions',
    {
        resolver: () => ConfigurationVersionTC.getResolver("findMany"),
        prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
            filter: (source) => ({
                configuration: source.id
            }),
        },
        projection: { configurationVersions: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTC.addRelation(
    'newestConfigurationVersions',
    {
        resolver: () => ConfigurationVersionTC.getResolver("findMany"),
        prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
            filter: (source) => ({
                configuration: source.id,
                isNewest: true
            }),
        },
        projection: { configuration: true, isNewest: true }, // point fields in source object, which should be fetched from DB
    }
);