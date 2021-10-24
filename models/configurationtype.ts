const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from '../graphql/createObjectTC';
import { MsGraphResourceTC } from '../models/msgraphresource';
import { ConfigurationTC, Configuration } from '../models/configuration';
 
const configurationTypeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    msGraphResource: {
        type: Schema.Types.ObjectId,
        ref: 'MsGraphResource',
        require: true
    }
}, {
    timestamps: true
});

export const ConfigurationType = mongoose.models.ConfigurationType || mongoose.model('ConfigurationType', configurationTypeSchema);
export const ConfigurationTypeTC = createObjectTC({ model: ConfigurationType, customizationOptions: {} });


ConfigurationTypeTC.addRelation(
    'configurations',
    {
        resolver: () => ConfigurationTC.mongooseResolvers.dataLoaderMany(),
        prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
            filter: (source) => ({
                configurationType: source.id
            }),
        },
        projection: { configurations: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTypeTC.addRelation(
    'msGraphResource',
    {
        resolver: () => MsGraphResourceTC.mongooseResolvers.findById(),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.msGraphResource,
        },
        projection: { msGraphResource: true }, // point fields in source object, which should be fetched from DB
    }
);

ConfigurationTypeTC.mongooseResolvers.removeById().wrapResolve((next) => async rp => {
    // extend resolve params with hook
    rp.beforeRecordMutate = async (doc, resolveParams) => {
        console.log("ConfigurationTypeTC: check if doc can be delete safely");
        let relatedObjects = await Configuration.find({ configurationType: doc._id });

        if (relatedObjects.length > 0) {
            console.log("ConfigurationTypeTC: found " + relatedObjects.length + " related docs. unable to proceed.");
        } else {
            // continue with mutation
            return doc;
        }
    };
    return next(rp);
});