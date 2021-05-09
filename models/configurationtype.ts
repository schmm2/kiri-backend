const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from '../graphql/createObjectTC';

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