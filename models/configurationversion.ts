const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

const configurationversionSchema = new Schema({
    displayName: {
        type: String,
        required: true
    },
    graphModifiedAt: {
        type: String,
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

export const ConfigurationVersionTC = composeWithMongoose(mongoose.model('ConfigurationVersion', configurationversionSchema));
export const ConfigurationVersion = mongoose.model('ConfigurationVersion', configurationversionSchema);