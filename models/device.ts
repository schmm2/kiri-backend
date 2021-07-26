const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from "../graphql/createObjectTC";

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

export const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
export const DeviceTC = createObjectTC({ model: Device, customizationOptions: {} });