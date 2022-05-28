const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from '../graphql/createObjectTC';
import { ConfigurationTypeTC } from '../models/configurationtype';
import { ConfigurationType } from '../models/configurationtype';

const msgraphresourceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    resource: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    nameAttribute: {
        type: String,
        require: true,
        default: "displayName"
    },
    expandAttributes: {
        type: [String],
        require: false,
        default: null
    },
    category: {
        type: String,
        require: true,
        default: "configuration"
    },
}, {
    timestamps: true
});


export const MsGraphResource = mongoose.models.MsGraphResource || mongoose.model('MsGraphResource', msgraphresourceSchema);
export const MsGraphResourceTC = createObjectTC({ model: MsGraphResource, customizationOptions: {} });


MsGraphResourceTC.addRelation(
    'configurationTypes',
    {
        resolver: () => ConfigurationTypeTC.mongooseResolvers.findMany(),
        prepareArgs: {
            filter: source => ({
                msGraphResource: source._id
            }),
        },
        projection: { configurationTypes: true }, // point fields in source object, which should be fetched from DB
    }
);

MsGraphResourceTC.mongooseResolvers.removeById().wrapResolve((next) => async rp => {
    // extend resolve params with hook
    rp.beforeRecordMutate = async (doc, resolveParams) => {
        console.log("MsGraphResourceTC: check if doc can be delete safely");
        let relatedMsGraphResources = await ConfigurationType.find({ msGraphResource: doc._id });

        if (relatedMsGraphResources.length > 0) {
            console.log("MsGraphResourceTC: found " + relatedMsGraphResources.length + " related docs. unable to proceed.");
        } else {
            // continue with mutation
            return doc;
        }
    };
    return next(rp);
});