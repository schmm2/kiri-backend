/*
 * Parameters:
 *  graphValue: ,
 *  graphResourceUrl: ,
 *  tenant: ,
 */

import { AzureFunction, Context } from "@azure/functions"
import { createErrorResponse } from '../utils/createErrorResponse';
import { createSettingsHash } from '../utils/createSettingsHash';

var mongoose = require('mongoose');

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    let functionName = "ACT3020ConfigurationVersionCreate"
    context.log(functionName, "Start Configuration Handeling");

    let configurationGraphValue = parameter.payload.graphValue;
    let existingNewestConfigurationVersionDbId = parameter.payload.newestConfigurationVersionIdInDB;

    let ConfigurationVersion = mongoose.model('ConfigurationVersion');

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
        let existingNewestConfigurationVersion = await ConfigurationVersion.findById(existingNewestConfigurationVersionDbId);
        
        if (existingNewestConfigurationVersion && existingNewestConfigurationVersion._id) {
            let addConfigurationVersionResponse = await ConfigurationVersion.create({
                value: configurationObjectFromGraphJSON,
                version: configurationObjectFromGraphVersion,
                configuration: existingNewestConfigurationVersion.configuration,
                isNewest: true,
                state: "modified",
                displayName: configurationGraphValue.displayName,
                graphModifiedAt: configurationGraphValue.lastModifiedDateTime
            });

            if (addConfigurationVersionResponse._id) {
                response.createdConfigurationVersionId = addConfigurationVersionResponse._id
                response.message = configurationGraphValue.displayName + ": stored new configuration version"
                response.state = "SUCCESS"
            }
            else {
                context.log.error(configurationObjectFromGraphJSON)
                return createErrorResponse("error: unable to create configuration version, " + configurationGraphValue.displayName, context, functionName);
            }
            // context.log("new version: ", addConfigurationVersionResponse);

            // set active configurationversion to old state if the objects exists
            existingNewestConfigurationVersion.isNewest = false;
            existingNewestConfigurationVersion.save();
        } else {
            context.log.error("error: unable to find existing configVersion")
        }
    } else {
        response.message = configurationGraphValue.displayName + ": no change, newest configuration version already stored"
    }
    return response;
};
export default activityFunction;