import { SchemaComposer } from 'graphql-compose';
const schemaComposer = new SchemaComposer();

const { tenantQuery, tenantMutation } = require('./tenant');
const { msGraphResourceQuery, msGraphResourceMutation } = require('./msgraphresource');
const { configurationTypeQuery, configurationTypeMutation } = require('./configurationType');
const { deviceQuery, deviceMutation } = require('./device');
const { configurationQuery, configurationMutation } = require ('./configuration');
const { configurationVersionQuery, configurationVersionMutation } = require('./configurationversion');
const { jobQuery, jobMutation } = require('./job');
const { deploymentQuery, deploymentMutation } = require('./deployment');
const { deviceVersionQuery, deviceVersionMutation } = require('./deviceversion')
const { deviceWarrantyQuery, deviceWarrantyMutation} = require('./devicewarranty')

schemaComposer.Query.addFields({
    ...tenantQuery,
    ...msGraphResourceQuery,
    ...configurationTypeQuery,
    ...deviceQuery,
    ...configurationVersionQuery,
    ...configurationQuery,
    ...jobQuery,
    ...deploymentQuery,
    ...deviceVersionQuery,
    ...deviceWarrantyQuery
})

schemaComposer.Mutation.addFields({
    ...tenantMutation,
    ...msGraphResourceMutation,
    ...configurationTypeMutation,
    ...deviceMutation,
    ...configurationVersionMutation,
    ...configurationMutation,
    ...jobMutation,
    ...deploymentMutation,
    ...deviceVersionMutation,
    ...deviceWarrantyMutation
})

module.exports = schemaComposer.buildSchema(); 