const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from "../graphql/createObjectTC";
import { TenantTC } from '../models/tenant';
import { DeviceVersionTC } from '../models/deviceversion';

const deviceSchema = new Schema({
    deviceId: {
        type: String,
        required: true
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    }
}, {
    timestamps: true
});

export const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
export const DeviceTC = createObjectTC({ model: Device, customizationOptions: {} });

DeviceTC.addRelation(
    'tenant',
    {
        resolver: () => TenantTC.mongooseResolvers.findById(),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.tenant,
        },
        projection: { tenant: true }, // point fields in source object, which should be fetched from DB
    }
); 

DeviceTC.addRelation(
    'newestDeviceVersions',
    {
        resolver: () => DeviceVersionTC.mongooseResolvers.findMany(),
        prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
            filter: (source) => ({
                device: source.id,
                successorVersion: null
            }),
        },
        projection: { device: true, successorVersion: true }, // point fields in source object, which should be fetched from DB
    }
);