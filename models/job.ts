const mongoose = require('mongoose');
import { TenantTC } from '../models/tenant';
import { createObjectTC } from '../graphql/createObjectTC';

const expireAfterSeconds = 3600;

const jobSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        require: true
    }
}, {
    timestamps: true
});

// set expire index
jobSchema.index({"_ts":1}, {expireAfterSeconds: expireAfterSeconds});

export const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);
export const JobTC = createObjectTC({ model: Job, customizationOptions: {} });

JobTC.addRelation(
    'tenant',
    {
        resolver: () => TenantTC.getResolver("findById"),
        prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
            _id: (source) => source.tenant,
        },
        projection: { tenant: true }, // point fields in source object, which should be fetched from DB
    }
); 