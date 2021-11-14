/*
 * Get Deployment from Database -> tenants and configuration ids
 * Check every tenant if the configuration already exists -> Graph API, filter name
 * Update or create the configuration according to API response
 */

import * as df from "durable-functions"
import { Job } from "../models/job";
import { createSettingsHash } from '../utils/createSettingsHash'

const orchestrator = df.orchestrator(function* (context) {
    let functionName = "ORC1300DeploymentRun";
    if (!context.df.isReplaying) context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    // console.log(queryParameters);

    // get deployment
    let deploymentId = queryParameters.deploymentId;
    let deployment = yield context.df.callActivity("ACT1050DeploymentGetById", deploymentId);

    if (deployment) {
        if (!context.df.isReplaying) context.log(functionName, "found deployment " + deploymentId);

        // get deploymentreference for this deployment
        let deploymentReferences = yield context.df.callActivity("ACT1070DeploymentReferenceByDeploymentId", deploymentId);
        if (!context.df.isReplaying) context.log(deploymentReferences)

        let tenants = deployment.tenants
        let configurationIds = deployment.configurations

        for (let t = 0; t < tenants.length; t++) {
            let tenantId = tenants[t];
            if (!context.df.isReplaying) context.log(functionName, "handle tenant " + tenantId);

            // Get full tenant object
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantId);

            // Create Job
            let jobData = {
                type: "DEPLOYMENT",
                state: "STARTED",
                tenant: tenantId,
                logs: ""
            };

            let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
            //if (!context.df.isReplaying) context.log("new job", job);

            let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);

            if (accessTokenResponse && accessTokenResponse.accessToken) {
                if (accessTokenResponse.ok) {
                    if (!context.df.isReplaying) context.log(functionName, "got an accessToken");

                    for (let c = 0; c < configurationIds.length; c++) {
                        let configurationId = configurationIds[c];

                        // find deploymentReference per tenant and sourceConfiguration
                        let deploymentRefencesFiltered = deploymentReferences.filter(item => (item.sourceConfiguration === configurationId && item.tenant === tenant._id));
                        // if (!context.df.isReplaying) context.log(deploymentRefencesFiltered)

                        // get full configurationVersion
                        let newestConfigurationVersion = yield context.df.callActivity("ACT1062ConfigurationGetNewestConfigurationVersion", configurationId);
                        // if (!context.df.isReplaying) context.log(newestConfigurationVersion);

                        // get msgraphresource
                        let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configurationId);
                        //if (!context.df.isReplaying) context.log(msGraphResource);

                        // no deployment reference stored yet
                        if (deploymentRefencesFiltered.length == 0) {
                            // create destination policy
                            let payload = {
                                tenantDbId: tenant._id,
                                msGraphResourceUrl: msGraphResource.resource,
                                configurationVersionDbId: newestConfigurationVersion._id,
                                configurationName: newestConfigurationVersion.displayName
                            }

                            let createdConfiguration = yield context.df.callSubOrchestrator("ORC1101MEMConfigurationCreate", payload, context.df.instanceId + '1');
                            // if (!context.df.isReplaying) context.log(createdConfiguration);

                            if (createdConfiguration.id) {
                                // store in database
                                let newConfigParameter = {
                                    graphValue: createdConfiguration,
                                    graphResourceUrl: msGraphResource.resource,
                                    tenant: tenant
                                }
                                let newConfigResponseResponse = yield context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", newConfigParameter);
                                // if (!context.df.isReplaying) context.log(newConfigResponseResponse)

                                if (newConfigResponseResponse.createdConfigurationId) {
                                    // add deploymentReference
                                    let deploymentReference = {
                                        tenant: tenant._id,
                                        sourceConfiguration: configurationId,
                                        destinationConfiguration: newConfigResponseResponse.createdConfigurationId,
                                        deployment: deploymentId
                                    }

                                    let deploymentReferenceResponse = yield context.df.callActivity("ACT1071DeploymentReferenceCreate", deploymentReference);
                                    if(deploymentReferenceResponse._id){
                                        // if (!context.df.isReplaying) context.log(deploymentReferenceResponse);
                                        job.state = "FINISHED"
                                        job.log += "deploymentReference stored"
                                    }else{
                                        job.state = "ERROR"
                                        job.log += newestConfigurationVersion.displayName + " ,unable to store deploymentReference" 
                                    }  
                                }else{
                                    job.state = "ERROR"
                                    job.log += newestConfigurationVersion.displayName + ", unable to store configuration"
                                }
                            }
                            else{
                                job.state = "ERROR"
                                job.log += newestConfigurationVersion.displayName + ", unable to create configuration in tenant " + tenant.name
                            }
                        } else { // Deployment Reference already stored

                            let deploymentReference = deploymentRefencesFiltered[0];
                            // if (!context.df.isReplaying) context.log(deploymentReference)

                            // ### Compare Settings Values
                            // # Get Settings from Destination Configuration
                            if (deploymentReference.destinationConfiguration) {
                                // get full configuration from DB
                                let destinationConfigurationInDB = yield context.df.callActivity("ACT1061ConfigurationGetById", deploymentReference.destinationConfiguration);
                                // if (!context.df.isReplaying) context.log(destinationConfigurationInDB);

                                // get full configurationVersion from DB
                                let newestConfigurationVersionInDB = yield context.df.callActivity("ACT1062ConfigurationGetNewestConfigurationVersion", destinationConfigurationInDB._id);
                                // if (!context.df.isReplaying) context.log(newestConfigurationVersion);

                                if (destinationConfigurationInDB) {
                                    // Get Destination Configuratio via Graph
                                    let configurationGraphUrl = msGraphResource.resource + "/" + destinationConfigurationInDB.graphId
                                    let payload = {
                                        graphResourceUrl: configurationGraphUrl,
                                        accessToken: accessTokenResponse.accessToken
                                    }
                                    let destinationConfigurationFromGraph = yield context.df.callActivity("ACT2000MsGraphQuery", payload);
                                    //if (!context.df.isReplaying) context.log(destinationConfigurationFromGraph);

                                    // Calculate Hash of Settings to compare it to stored version
                                    let configurationFromGraphSettingsHash = createSettingsHash(destinationConfigurationFromGraph.result)
                                    // if (!context.df.isReplaying) context.log(configurationFromGraphSettingsHash);

                                    // Compare Hash
                                    if (configurationFromGraphSettingsHash === newestConfigurationVersionInDB.version) {
                                        if (!context.df.isReplaying) context.log(functionName, "Tenant Config up to date");
                                        job.state = "FINISHED"
                                        job.log += newestConfigurationVersionInDB.displayName + ", config in tenant " + tenant.name + "is up to date"     
                                    } else {
                                        // Update Config in Tenant
                                        let payload = {
                                            tenantDbId: tenant._id,
                                            msGraphResourceUrl: msGraphResource.resource,
                                            configurationVersionDbId: newestConfigurationVersionInDB._id,
                                            accessToken: accessTokenResponse.accessToken
                                        }
                                        
                                        let updatedConfigurationResponse = yield context.df.callSubOrchestrator("ORC1100MEMConfigurationUpdate", payload, context.df.instanceId + '2');
                                        if (updatedConfigurationResponse.state === "FNISHED") {
                                            if (!context.df.isReplaying) context.log(updatedConfigurationResponse);
                                            job.state = "FINISHED"
                                            job.log += newestConfigurationVersionInDB.displayName + ", update config in tenant " + tenant.name
                                        } else {
                                            job.state = "ERROR"
                                            job.log += newestConfigurationVersionInDB.displayName + ", unable to update config in tenant " + tenant.name
                                        }    
                                    }
                                }else{
                                    job.state = "ERROR"
                                    job.log += newestConfigurationVersionInDB.displayName + ", internal error"
                                }
                            }
                        }
                    }
                }
            }
            let jobResponse = yield context.df.callActivity("ACT1020JobUpdate", job);
        }
    }

    return null;
});

export default orchestrator;
