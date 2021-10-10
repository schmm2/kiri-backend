﻿/*
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

const orchestrator = df.orchestrator(function* (context) {
    console.log("ORC1101MsGraphConfigurationCreate", "start");

    const queryParameters: any = context.df.getInput();
    // console.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let msGraphResource = queryParameters.msGraphResource;
    let msGraphResourceUrl = msGraphResource.resource;
    let configurationDisplayName = queryParameters.configurationName

    // Create Job
    let jobData = {
        type: "CONFIGURATION_CREATE",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // finished Job Data
    let finishedJobState = {
        _id: job._id,
        state: "FINISHED",
        message: "Done"
    };

    // get Tenant & AccessToken
    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);
    // console.log("ORC1101MsGraphConfigurationCreate, accessTokenResponse", accessTokenResponse);

    if (accessTokenResponse.body && accessTokenResponse.body.accessToken) {
        // get ConfigurationVersion
        let newConfigurationVersion = yield context.df.callActivity("ACT1040ConfigurationVersionGetById", configurationVersionDbId);
        // console.log("ORC1101MsGraphConfigurationCreate, new Configuration Version", newConfigurationVersion);

        if (newConfigurationVersion) {
            console.log("ORC1101MsGraphConfigurationCreate", "parameters ok");

            let accessToken = accessTokenResponse.body.accessToken;
            let newConfigurationVersionValue = JSON.parse(newConfigurationVersion.value);

            // replace displayName
            newConfigurationVersionValue.displayName = configurationDisplayName;

            let dataValidationParameter = {
                msGraphResourceUrl: msGraphResourceUrl,
                dataObject: newConfigurationVersionValue
            }

            // console.log("ORC1101MsGraphConfigurationCreate, data validation parameter", dataValidationParameter);
            let newConfigurationValidated = yield context.df.callActivity("ACT2011MsGraphCreateDataValidation", dataValidationParameter);

            let createParameter = {
                accessToken: accessToken,
                dataObject: newConfigurationValidated,
                msGraphApiUrl: msGraphResourceUrl
            }

            // console.log("ORC1101MsGraphConfigurationCreate, patch parameter", patchParameter);
            let msGraphResponse = yield context.df.callActivity("ACT2003MsGraphPost", createParameter);

            if (!msGraphResponse.ok) {
                if (msGraphResponse.message && msGraphResponse.message.code) {
                    context.log(msGraphResponse);
                    finishedJobState.message = "Error: " + msGraphResponse.message.code;
                    if(msGraphResponse.message.body){
                        let responseMessage = JSON.parse(msGraphResponse.message.body)
                        responseMessage = (JSON.parse(responseMessage.message)).Message
                        finishedJobState.message += ", Message: "+ responseMessage
                    }
                }
                finishedJobState.state = 'ERROR'
            } else {
                // get id of just created new config
                let newConfigurationId = msGraphResponse.message.id;

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
                        
                        if(!createDefinitionValuesResponse.ok){
                            // Todo
                        }
                    }
                }
            }
        } else {
            finishedJobState.message = 'Invalid Parameters, unable to find configurationVersion';
            finishedJobState.state = 'ERROR'
        }
    } else {
        finishedJobState.message = 'Invalid Parameters, unable to create access token';
        finishedJobState.state = 'ERROR'
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", finishedJobState);
    // console.log(updatedJobResponse);
});

export default orchestrator;