const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

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

export const ConfigurationTypeTC = composeWithMongoose(mongoose.model('ConfigurationType', configurationTypeSchema));
export const ConfigurationType = mongoose.model('ConfigurationType', configurationTypeSchema); 