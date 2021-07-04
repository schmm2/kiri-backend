const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from '../graphql/createObjectTC';
import { ConfigurationTypeTC } from '../models/configurationtype';


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
    }
}, {
    timestamps: true
});


export const MsGraphResource = mongoose.models.MsGraphResource || mongoose.model('MsGraphResource', msgraphresourceSchema);
export const MsGraphResourceTC = createObjectTC({ model: MsGraphResource, customizationOptions: {} });


MsGraphResourceTC.addRelation(
    'configurationTypes',
    {
        resolver: () => ConfigurationTypeTC.getResolver('findMany'),
        prepareArgs: { 
            filter: source => ({
                msGraphResource: source._id
            }),
        },
        projection: { configurationTypes: true }, // point fields in source object, which should be fetched from DB
    }
);