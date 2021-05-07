const { SchemaComposer } = require('graphql-compose');
const schemaComposer = new SchemaComposer();

const { tenantQuery, tenantMutation } = require('./tenant');
const { msGraphResourceQuery, msGraphResourceMutation } = require('./msgraphresource');
const { configurationTypeQuery, configurationTypeMutation } = require('./configurationType');
const { deviceQuery, deviceMutation } = require('./device');
const { configurationQuery, configurationMutation } = require ('./configuration');
const { configurationVersionQuery, configurationVersionMutation } = require('./configurationversion');

schemaComposer.Query.addFields({
    ...tenantQuery,
    ...msGraphResourceQuery,
    ...configurationTypeQuery,
    ...deviceQuery,
    ...configurationVersionQuery,
    ...configurationQuery
})

schemaComposer.Mutation.addFields({
    ...tenantMutation,
    ...msGraphResourceMutation,
    ...configurationTypeMutation,
    ...deviceMutation,
    ...configurationVersionMutation,
    ...configurationMutation
})

module.exports = schemaComposer.buildSchema(); 