/*
 * Parameters:
 *  graphValue: ,
 *  graphResourceUrl: ,
 *  tenant: ,
 */

import { AzureFunction, Context } from "@azure/functions"
import { createSettingsHash } from '../utils/createSettingsHash';
import { createErrorResponse } from '../utils/createErrorResponse';

var mongoose = require('mongoose');

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    let functionName = "ACT3010ConfigurationCreate"
    context.log(functionName, "Start Configuration Handeling");

    let configurationGraphValue = parameter.payload;
    let msGraphResource = parameter.msGraphResource;
    let graphResourceUrl = parameter.graphResourceUrl;
    let tenant = parameter.tenant;

    let Configuration = mongoose.model('Configuration');
    let ConfigurationType = mongoose.model('ConfigurationType');
    let ConfigurationVersion = mongoose.model('ConfigurationVersion');

    let response = {
        ok: true,
        state: 'DEFAULT',
        message: "",
        createdConfigurationId: null,
        createdConfigurationVersionId: null
    };

    // validated object
    if (configurationGraphValue && configurationGraphValue.id) {
        context.log("handle configuration: " + configurationGraphValue.id);

        let configurationObjectFromGraph = configurationGraphValue;

        // define configurationType from configuration we received via graph
        // this information is important to link the configuration to a configurationType
        let configurationTypeName = null

        if (configurationObjectFromGraph["@odata.type"]) {
            configurationTypeName = configurationObjectFromGraph["@odata.type"].replace("#microsoft.graph.", "");
        } else {
            // Graph Exceptions
            // Exception: Some resource do not contain a odata property (example: App Protection Policy)

            let graphResourceUrlArray = graphResourceUrl.split('/');
            configurationTypeName = graphResourceUrlArray[graphResourceUrlArray.length - 1];

            // Astetic changes to the DataType
            // we wish to store the type but only the signular form of the word
            // handle word ending with "Policies"
            if (configurationTypeName.slice(-8) == "Policies") {
                configurationTypeName = configurationTypeName.slice(0, -8);
                configurationTypeName = configurationTypeName + "Policy"
            }
            // we take the url, use the last part => resource identifier and remove the plural 's' if it exists
            else if (configurationTypeName.slice(-1) == "s") {
                // remove plurar s
                configurationTypeName = configurationTypeName.slice(0, -1);
            }
        }

        // check data Type
        if (configurationTypeName) {
            context.log(functionName, "configurationTypeName defined: " + configurationTypeName);

            // find configurationType Id
            let configurationTypes = await ConfigurationType.find({ name: configurationTypeName });
            // context.log("found configurationtypes: " + JSON.stringify(configurationTypes));

            if (configurationTypes.length > 0 && configurationTypes[0].id) {
                // Create Configuration
                let addConfigurationResponse = await Configuration.create({
                    graphIsDeleted: false,
                    graphId: configurationObjectFromGraph.id,
                    graphCreatedAt: configurationObjectFromGraph.createdDateTime ? configurationObjectFromGraph.createdDateTime: 'undefined',
                    configurationType: configurationTypes[0].id,
                    tenant: tenant
                });

                // context.log("created new configuration element");
                // context.log("created configuration response: " + JSON.stringify(addConfigurationResponse));

                // complete object
                let configurationObjectFromGraphJSON = JSON.stringify(configurationObjectFromGraph);
                let configurationObjectFromGraphVersion = createSettingsHash(configurationObjectFromGraphJSON)

                // configuration added succedfully, add configVersion
                if (addConfigurationResponse && addConfigurationResponse._id) {
                    response.createdConfigurationId = addConfigurationResponse._id;

                    // find displayName
                    let displayName = null;
                    if(msGraphResource.nameAttribute){
                        context.log(functionName, "use different Name Attribut: " + msGraphResource.nameAttribute)
                        displayName = configurationObjectFromGraph[msGraphResource.nameAttribute]
                    }else{
                        displayName = configurationObjectFromGraph.displayName
                    }

                    let addConfigurationVersionResponse = await ConfigurationVersion.create({
                        displayName: displayName,
                        graphModifiedAt: configurationObjectFromGraph.lastModifiedDateTime,
                        value: configurationObjectFromGraphJSON,
                        version: configurationObjectFromGraphVersion,
                        isNewest: true,
                        configuration: addConfigurationResponse._id
                    });

                    if (addConfigurationVersionResponse._id) {
                        response.createdConfigurationVersionId = addConfigurationVersionResponse._id;
                        response.message = configurationObjectFromGraph.displayName + ": saved, new configuration"
                        response.state = "SUCCESS"
                        return response; // all done
                    }
                    else {
                        context.log.error(configurationObjectFromGraphJSON)
                        return createErrorResponse("unable to save configuration version," + configurationObjectFromGraph.displayName, context, functionName)
                    }
                } else {
                    return createErrorResponse("unable to save configuration, " + configurationObjectFromGraph.id, context, functionName)
                }
            } else {
                return createErrorResponse("configurationType not defined in Db, " + configurationTypeName, context, functionName)
            }
        } else {
            context.log(configurationObjectFromGraph);
            return createErrorResponse('configurationType name not defined', context, functionName)
        }
    }
    return response;
};
export default activityFunction;