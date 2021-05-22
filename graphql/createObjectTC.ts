const { composeWithMongoose } = require("graphql-compose-mongoose");
import { schemaComposer } from 'graphql-compose';

export function createObjectTC({ model, customizationOptions = {} }) {
    let ModelTC = null;

    try {
        ModelTC = schemaComposer.getOTC(model.modelName);
    } catch {
        ModelTC = composeWithMongoose(model, customizationOptions);
    }

    return ModelTC;
}