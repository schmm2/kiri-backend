const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from '../graphql/createObjectTC';
import { MsGraphResourceTC } from '../models/msgraphresource';

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
    },
    configurations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Configuration'
    }]
}, {
    timestamps: true
});

export const ConfigurationType = mongoose.models.ConfigurationType || mongoose.model('ConfigurationType', configurationTypeSchema);
export const ConfigurationTypeTC = createObjectTC({ model: ConfigurationType, customizationOptions: {} });


ConfigurationTypeTC.addRelation(
    'msGraphResource',
    {
        resolver: () => MsGraphResourceTC.getResolver("findById"),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.msGraphResource,
        },
        projection: { msGraphResource: true }, // point fields in source object, which should be fetched from DB
    }
);