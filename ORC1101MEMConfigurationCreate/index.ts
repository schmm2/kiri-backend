/*
    Create Configuration in MEM
    tenantDbI: create a configuration in the destination Tenant
    configurationDisplayName: overwrite config displayName
    accessToken: accessToken
 */

import * as df from "durable-functions"
import { createErrorResponse } from "../utils/createErrorResponse"

const functionName = "ORC1101MsGraphConfigurationCreate"

const orchestrator = df.orchestrator(function* (context) {
    // if (!context.df.isReplaying) context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    // if (!context.df.isReplaying) context.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let configurationDisplayName = queryParameters.configurationName
    let accessToken = queryParameters.accessToken ? queryParameters.accessToken : null;

    let newConfiguration;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_CREATE",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // check parameters
    if (!configurationVersionDbId || !configurationDisplayName || !tenantDbId) {
        job.log.push({ message: "invalid parameters", state: "Error" });
        job.state = 'ERROR'
    }
    else { // all parameters ok
        // get accessToken if needed, not executed if received an accessToken via Parameter
        if (!accessToken) {
            // get Tenant & accessToken
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
            let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);
            // if (!context.df.isReplaying) context.log(functionName + ", accessToken", accessTokenResponse);

            if (accessTokenResponse.accessToken) {
                accessToken = accessTokenResponse.accessToken;
            }
        }

        // AccessToken available
        if (accessToken) {
            // get ConfigurationVersion
            let newConfigurationVersion = yield context.df.callActivity("ACT1040ConfigurationVersionGetById", configurationVersionDbId);
            let configurationDbId = newConfigurationVersion.configuration;
            // if (!context.df.isReplaying) context.log(functionName + ", new Configuration Version", newConfigurationVersion);

            if (newConfigurationVersion) {
                // if (!context.df.isReplaying) context.log(functionName, "parameters ok");
                let newConfigurationVersionValue = JSON.parse(newConfigurationVersion.value);

                // get msgraphresource
                let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configurationDbId);
                let msGraphResourceUrl = msGraphResource.resource
                // if (!context.df.isReplaying) context.log("msGraphResource");
                // if (!context.df.isReplaying) context.log(msGraphResource);

                // replace displayName if needed
                if (configurationDisplayName) {
                    newConfigurationVersionValue.displayName = configurationDisplayName;
                }
                
                let dataValidationParameter = {
                    msGraphResourceUrl: msGraphResourceUrl,
                    dataObject: newConfigurationVersionValue
                }

                let newConfigurationValidated = yield context.df.callActivity("ACT2011MsGraphCreateDataValidation", dataValidationParameter);
                // if (!context.df.isReplaying) context.log(functionName + ", data validation parameter", dataValidationParameter);
                
                let createParameter = {
                    accessToken: accessToken,
                    dataObject: newConfigurationValidated,
                    msGraphApiUrl: msGraphResourceUrl
                }
                job.log.push({ message: 'trying to create config ' + newConfigurationVersionValue.displayName, state: "DEFAULT" });
                
                // if (!context.df.isReplaying) context.log(functionName + ", patch parameter", createParameter);
                let msGraphResponse = yield context.df.callActivity("ACT2003MsGraphPost", createParameter);
                // if (!context.df.isReplaying) context.log(functionName, msGraphResponse)

                if (!msGraphResponse.ok) {
                    job.log.push({ message: 'error msGraph Post', state: "ERROR" });
                    job.log.push({ message: msGraphResponse.message, state: "ERROR" });
                    job.state = 'ERROR'
                } else {
                    // get full object & id of just created new config
                    newConfiguration = msGraphResponse.data;
                    let newConfigurationId = msGraphResponse.data.id;

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
                    job.log.push({ message: 'config created', state: "SUCCESS" });
                    job.state = "FINISHED"
                }
            } else {
                job.log.push({ message: 'Invalid Parameters, unable to find configurationVersion', state: "ERROR" });
                job.state = 'ERROR'
            }
        } else {
            job.log.push({ message: 'Invalid Parameters, unable to create access token', state: "ERROR" });
            job.state = 'ERROR'
        }
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);

    if (job.state == "ERROR") {
        return createErrorResponse('error', context, functionName);
    }

    // return newly created config
    context.log(newConfiguration)
    return newConfiguration;
});

export default orchestrator;
