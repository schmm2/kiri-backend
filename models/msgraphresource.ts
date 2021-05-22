const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

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
    configurationTypes: [{
        type: Schema.Types.ObjectId,
        ref: 'ConfigurationType'
    }]
}, {
    timestamps: true
});

export const MsGraphResourceTC = composeWithMongoose(mongoose.model('MsGraphResource', msgraphresourceSchema));
export const MsGraphResource = mongoose.model('MsGraphResource', msgraphresourceSchema);