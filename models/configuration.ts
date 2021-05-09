const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

const configurationSchema = new Schema({
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
    configurationType: {
        type: Schema.Types.ObjectId,
        ref: 'ConfigurationType',
        require: true
    },
    configurationVersions: [{
        type: Schema.Types.ObjectId,
        ref: 'ConfigurationVersion'
    }]
}, {
    timestamps: true
});

export const ConfigurationTC = composeWithMongoose(mongoose.model('Configuration', configurationSchema));
export const Configuration = mongoose.model('Configuration', configurationSchema); 