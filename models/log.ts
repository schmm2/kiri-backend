const mongoose = require('mongoose');
import { createObjectTC } from '../graphql/createObjectTC';

export const logSchema = new mongoose.Schema({
    message: { type: String },
    action: { type: String },
    state: {
        type: String,
        enum: ['DEFAULT', 'WARNING', 'ERROR', 'SUCCESS'],
        default: 'DEFAULT'
    }
})

export const Log = mongoose.models.Log || mongoose.model('Log', logSchema);
export const LogbTC = createObjectTC({ model: Log, customizationOptions: {} });