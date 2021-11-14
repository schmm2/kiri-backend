/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your 
 *    function app in Kudu
 */

import * as df from "durable-functions"
import { createErrorResponse } from "../utils/createErrorResponse"

const functionName = "ORC1101MsGraphConfigurationCreate"

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    // if (!context.df.isReplaying) context.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let msGraphResourceUrl = queryParameters.msGraphResourceUrl;
    let configurationDisplayName = queryParameters.configurationName
    let accessToken = queryParameters.accessToken ? queryParameters.accessToken : null;

    let newConfigurationId;
    let newConfiguration;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_CREATE",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // check parameters
    if (!configurationVersionDbId || !configurationDisplayName || !tenantDbId || !msGraphResourceUrl) {
        job.message = 'Invalid Parameters';
        job.state = 'ERROR'
    }
    else { // all parameters ok
        // get accessToken if needed, not executed if received an accessToken via Parameter
        if (!accessToken) {
            // get Tenant
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);

            // get accessToken
            let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);
            // if (!context.df.isReplaying) context.log(functionName + ", accessToken", accessTokenResponse);

            if (accessTokenResponse.body.accessToken) {
                accessToken = accessTokenResponse.body.accessToken;
            }
        }

        // AccessToken available
        if (accessToken) {
            // get ConfigurationVersion
            let newConfigurationVersion = yield context.df.callActivity("ACT1040ConfigurationVersionGetById", configurationVersionDbId);
            // if (!context.df.isReplaying) context.log(functionName + ", new Configuration Version", newConfigurationVersion);

            if (newConfigurationVersion) {
                if (!context.df.isReplaying) context.log(functionName, "parameters ok");

                let newConfigurationVersionValue = JSON.parse(newConfigurationVersion.value);

                // replace displayName
                newConfigurationVersionValue.displayName = configurationDisplayName;

                let dataValidationParameter = {
                    msGraphResourceUrl: msGraphResourceUrl,
                    dataObject: newConfigurationVersionValue
                }

                // if (!context.df.isReplaying) context.log(functionName + ", data validation parameter", dataValidationParameter);
                let newConfigurationValidated = yield context.df.callActivity("ACT2011MsGraphCreateDataValidation", dataValidationParameter);

                let createParameter = {
                    accessToken: accessToken,
                    dataObject: newConfigurationValidated,
                    msGraphApiUrl: msGraphResourceUrl
                }

                // if (!context.df.isReplaying) context.log(functionName + ", patch parameter", createParameter);
                let msGraphResponse = yield context.df.callActivity("ACT2003MsGraphPost", createParameter);

                if (!msGraphResponse.ok) {
                    if (msGraphResponse.message && msGraphResponse.message.code) {
                        if (!context.df.isReplaying) context.log(msGraphResponse);
                        job.message = "Error: " + msGraphResponse.message.code;
                        if (msGraphResponse.message.body) {
                            let responseMessage = JSON.parse(msGraphResponse.message.body)
                            responseMessage = (JSON.parse(responseMessage.message)).Message
                            job.message += ", Message: " + responseMessage
                        }
                    }
                    job.state = 'ERROR'
                    job.message = 'error msGraph Post'
                } else {
                    // get id of just created new config
                    newConfigurationId = msGraphResponse.message.id;

                    // get full object
                    newConfiguration = msGraphResponse.message;

                    // ***
                    // Group Policy
                    // group policy objects need to be handled differently, need to create definitionValues 
                    // ***
                    if (msGraphResourceUrl == "/deviceManagement/groupPolicyConfigurations" &&
                        (newConfigurationValidated.gpoSettings && newConfigurationValidated.gpoSettings.length > 0)) {

                        let groupPolicyUrl = "/deviceManagement/groupPolicyConfigurations/" + newConfigurationId + "/definitionValues";

                        // add new definitionValues
                        for (let i = 0; i < newConfigurationValidated.gpoSettings.length; i++) {
                            let gpoSetting = newConfigurationValidated.gpoSettings[i];

                            let newGpoDefinitionValue = {
                                msGraphApiUrl: groupPolicyUrl,
                                accessToken: accessToken,
                                dataObject: gpoSetting
                            }
                            let createDefinitionValuesResponse = yield context.df.callActivity("ACT2003MsGraphPost", newGpoDefinitionValue);

                            if (!createDefinitionValuesResponse.ok) {
                                // Todo
                            }
                        }
                    }
                    // return newly created config
                    return newConfiguration;
                }
            } else {
                job.message = 'Invalid Parameters, unable to find configurationVersion';
                job.state = 'ERROR'
            }
        } else {
            job.message = 'Invalid Parameters, unable to create access token';
            job.state = 'ERROR'
        }
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);

    if (job.state == "ERROR") {
        return createErrorResponse(job.message, context, functionName);
    } else {
        return job;
    }
});

export default orchestrator;
