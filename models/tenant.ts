const mongoose = require('mongoose');
import { Configuration, ConfigurationTC } from '../models/configuration';
import { ConfigurationVersion } from '../models/configurationversion'
import { Job, JobTC } from '../models/job';
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
      resolver: () => ConfigurationTC.mongooseResolvers.findMany(),
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
      resolver: () => JobTC.mongooseResolvers.findMany(),
      prepareArgs: {
         filter: source => ({
            tenant: source._id
         }),
      },
      projection: { jobs: true }, // point fields in source object, which should be fetched from DB
   }
);

TenantTC.mongooseResolvers.removeById().wrapResolve(next => async rp => {
   // extend resolve params with hook
   rp.beforeRecordMutate = async (doc, resolveParams) => {
      console.log("TenantTC: remove related data");
      // delete jobs
      await Job.deleteMany({ tenant: doc._id });

      // delete configurationVerions and configurations
      let configurations = await Configuration.find({ tenant: doc._id });

      for (let i = 0; i < configurations.length; i++) {
         await ConfigurationVersion.deleteMany({ configuration: configurations[i]._id })
         await Configuration.findOneAndDelete({ _id: configurations[i]._id })
      }

      // continue with mutation
      return doc;
   };
   return next(rp);
});