const mongoose = require('mongoose');
import { ConfigurationTC } from '../models/configuration';
import { JobTC } from '../models/job';
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
   }
}, {
   timestamps: true
});

export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
export const TenantTC = createObjectTC({ model: Tenant, customizationOptions: {} });

TenantTC.addRelation(
   'configurations',
   {
      resolver: () => ConfigurationTC.getResolver("findMany"),
      prepareArgs: {
         filter: source => ({
            tenant: source._id
         }),
      },
      projection: { configurations: true }, // point fields in source object, which should be fetched from DB
   }
);

TenantTC.addRelation(
   'jobs',
   {
      resolver: () => JobTC.getResolver("findMany"),
      prepareArgs: {
         filter: source => ({
            tenant: source._id
         }),
      },
      projection: { jobs: true }, // point fields in source object, which should be fetched from DB
   }
);