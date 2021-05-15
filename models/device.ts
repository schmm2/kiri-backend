const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

const deviceSchema = new Schema({
    deviceId: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    manufacturer: {
        type: String,
        required: false
    },
    version: {
        type: String,
        require: true
    }
}, {
    timestamps: true
});

export const DeviceTC = composeWithMongoose(mongoose.model('Device', deviceSchema));
export const Device = mongoose.model('Device', deviceSchema);