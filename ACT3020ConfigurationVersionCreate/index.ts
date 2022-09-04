/*
 * Parameters:
 *  graphValue: ,
 *  graphResourceUrl: ,
 *  tenant: ,
 */

import { AzureFunction, Context } from "@azure/functions"
import { createErrorResponse } from '../utils/createErrorResponse';
import { createSettingsHash } from '../utils/createSettingsHash';

const mongoose = require('mongoose');
const functionName = "ACT3020ConfigurationVersionCreate"
const ConfigurationVersion = mongoose.model('ConfigurationVersion');
const Configuration = mongoose.model('Configuration');

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    context.log(functionName, "Start Configuration Handeling");

    let configurationGraphValue = parameter.payload.graphValue;
    let configurationIdInDB = parameter.payload.configurationIdInDB;

    let response = {
        ok: true,
        state: 'DEFAULT',
        message: "",
        createdConfigurationVersionId: null
    };

    // validated object
    if (configurationGraphValue && configurationGraphValue.id) {
        context.log("handle configuration: " + configurationGraphValue.id);

        let configurationObjectFromGraphJSON = JSON.stringify(configurationGraphValue)
        let configurationObjectFromGraphVersion = createSettingsHash(configurationObjectFromGraphJSON)

        // get existing newest configversion
        let configuration = await Configuration.findById(configurationIdInDB);
        context.log(configuration)

        if (configuration && configuration._id) {
            let addConfigurationVersionResponse = await ConfigurationVersion.create({
                value: configurationObjectFromGraphJSON,
                version: configurationObjectFromGraphVersion,
                configuration: configuration._id,
                state: "modified",
                displayName: configurationGraphValue.displayName,
                graphModifiedAt: configurationGraphValue.lastModifiedDateTime
            });

            if (addConfigurationVersionResponse._id) {
                response.createdConfigurationVersionId = addConfigurationVersionResponse._id
                response.message = configurationGraphValue.displayName + ": stored new configuration version"
                response.state = "SUCCESS"

                // set newest configurationVersion on configuration
                configuration.newestConfigurationVersion = addConfigurationVersionResponse._id
                configuration.save()
            }
            else {
                context.log.error(configurationObjectFromGraphJSON)
                return createErrorResponse("error: unable to create configuration version, " + configurationGraphValue.displayName, context, functionName);
            }
            
        } else {
            context.log.error("error: unable to find existing configVersion")
        }
    } else {
        response.message = configurationGraphValue.displayName + ": no change, newest configuration version already stored"
    }
    return response;
};
export default activityFunction;