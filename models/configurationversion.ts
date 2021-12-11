const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from "../graphql/createObjectTC";
import { ConfigurationTC } from "./configuration";
import { DeploymentTC } from "./deployment";

const configurationversionSchema = new Schema({
    displayName: {
        type: String,
        required: true
    },
    graphModifiedAt: {
        type: String,
        required: true,
        index: true
    },
    state: {
        type: String,
        enum : ['new','modified','deleted'],
        default: 'new',
        required: true
    },
    value: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    isNewest: {
        type: Boolean,
        required: true
    },
    configuration: {
        type: Schema.Types.ObjectId,
        ref: 'Configuration',
        require: true
    }
}, {
    timestamps: true
});

export const ConfigurationVersion = mongoose.models.ConfigurationVersion || mongoose.model('ConfigurationVersion', configurationversionSchema);
export const ConfigurationVersionTC = createObjectTC({ model: ConfigurationVersion, customizationOptions: {} });

ConfigurationVersionTC.addRelation(
    'configuration',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.findById(),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.configuration,
        },
        projection: { configuration: true }, // point fields in source object, which should be fetched from DB
    }
);

/*
ConfigurationTC.addRelation(
    'deployment',
    {
        resolver: () => DeploymentTC.mongooseResolvers.findMany(),
        prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
            filter: (source) => ({
                deployment: source.id
            }),
        },
        projection: { deployment: true }, // point fields in source object, which should be fetched from DB
    }
);*/