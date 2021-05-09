const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

const tenantSchema = new Schema({
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
      type: Schema.Types.ObjectId,
      ref: 'Configuration'
    }]
}, {
   timestamps: true
});

export const TenantTC = composeWithMongoose(mongoose.model('Tenant', tenantSchema));
export const Tenant = mongoose.model('Tenant', tenantSchema);
