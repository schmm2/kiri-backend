const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from "../graphql/createObjectTC";
import { DeviceTC } from "./device";

const deviceversionSchema = new Schema({
    deviceName: {
        type: String,
        required: true
    },
    manufacturer: {
        type: String,
        required: false,
    },
    platform: {
        type: String,
        required: false,
    },
    osVersion: {
        type: String,
        required: false,
    },
    state: {
        type: String,
        enum : ['new','modified','deleted'],
        default: 'new',
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
    device: {
        type: Schema.Types.ObjectId,
        ref: 'Device',
        require: true
    },
    successorVersion: {
        type: Schema.Types.ObjectId,
        ref: 'DeviceVersion',
        require: false,
        default: null
    }
}, {
    timestamps: true
});

export const DeviceVersion = mongoose.models.DeviceVersion || mongoose.model('DeviceVersion', deviceversionSchema);
export const DeviceVersionTC = createObjectTC({ model: DeviceVersion, customizationOptions: {} });

DeviceVersionTC.addRelation(
    'device',
    {
        resolver: () => DeviceTC.getResolver("findById"),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.device,
        },
        projection: { device: true }, // point fields in source object, which should be fetched from DB
    }
);
