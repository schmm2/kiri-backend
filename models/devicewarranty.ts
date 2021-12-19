const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from "../graphql/createObjectTC";

const deviceWarrantySchema = new Schema({
    serialNumber: {
        type: String,
        required: true
    },
    productName: {
        type: String,
        required: false
    },
    endDate: {
        type: Date,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true
    },
}, {
    timestamps: true
});

export const DeviceWarranty = mongoose.models.DeviceWarranty || mongoose.model('DeviceWarranty', deviceWarrantySchema);
export const DeviceWarrantyTC = createObjectTC({ model: DeviceWarranty, customizationOptions: {} });