const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import { createObjectTC } from "../graphql/createObjectTC";
import { TenantTC } from '../models/tenant';

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
        resolver: () => TenantTC.getResolver("findById"),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.tenant,
        },
        projection: { tenant: true }, // point fields in source object, which should be fetched from DB
    }
); 