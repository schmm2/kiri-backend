const mongoose = require('mongoose');
import { ConfigurationTC } from '../models/configuration';
import { createObjectTC } from '../graphql/createObjectTC';

const tenantSchema = new mongoose.Schema({
   tenantId: {
      type: String,
      required: true
   },
   appId: {
      type: String,
      required: true
   },
   name: {
      type: String,
      required: true
   },
   verified: {
      type: Boolean,
      required: false,
      default: false
   },
   configurations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Configuration'
    }]
}, {
   timestamps: true
});

export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
export const TenantTC = createObjectTC({ model: Tenant, customizationOptions: {} });

TenantTC.addRelation(
   'configurations',
   {
       resolver: () => ConfigurationTC.getResolver("findByIds"),
       prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
           _ids: (source) => source.configurations,
       },
       projection: { configurations: true }, // point fields in source object, which should be fetched from DB
   }
);