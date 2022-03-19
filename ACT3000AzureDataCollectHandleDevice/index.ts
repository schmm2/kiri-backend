/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions"
import { osBuildToVersion } from "../utils/osBuildToVersion"
import { createSettingsHash } from "../utils/createSettingsHash";

var mongoose = require('mongoose');

async function addDeviceVersion(deviceObjectFromGraph, deviceId, version) {
    const DeviceVersion = mongoose.model('DeviceVersion');
    const deviceObjectFromGraphJSON = JSON.stringify(deviceObjectFromGraph);
    const osVersionName = osBuildToVersion(deviceObjectFromGraph.osVersion);

    return DeviceVersion.create({
        deviceName: deviceObjectFromGraph.deviceName,
        value: deviceObjectFromGraphJSON,
        version: version,
        device: deviceId,
        manufacturer: deviceObjectFromGraph.manufacturer ? deviceObjectFromGraph.manufacturer : '',
        operatingSystem: deviceObjectFromGraph.operatingSystem ? deviceObjectFromGraph.operatingSystem : '',
        osVersion: deviceObjectFromGraph.osVersion ? deviceObjectFromGraph.osVersion : '',
        osVersionName: osVersionName,
        upn: deviceObjectFromGraph.userPrincipalName ? deviceObjectFromGraph.userPrincipalName : '',
    });
}

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    context.log("ACT3000AzureDataCollectHandleDevice", "Start Device handeling");
    let Device = mongoose.model('Device')
    let DeviceVersion = mongoose.model('DeviceVersion')

    let deviceListGraph = parameter.payload
    let tenant = parameter.tenant

    let responses = [];

    // check for new devices
    for (var i = 0; i < deviceListGraph.length; i++) {
        let response = {
            ok: true,
            message: ""
        };

        const deviceObjectFromGraph = deviceListGraph[i];
        const graphDeviceId = deviceObjectFromGraph.id;
        const deviceObjectFromGraphJSON = JSON.stringify(deviceObjectFromGraph);
        // we are unable to use the version property as it does not exist on all graph resources => use md5 hash instead
        const deviceObjectFromGraphVersion = createSettingsHash(deviceObjectFromGraph);

        // check if device is already in db
        let devices = await Device.find({ deviceId: graphDeviceId });

        // ****
        // New Device
        // if id does not exist in db, we found a new device
        // ****
        if (devices.length == 0) {
            context.log("ACT3000AzureDataCollectHandleDevice", "found new device " + graphDeviceId);

            // create new device element
            let addDeviceResponse = await Device.create({
                deviceId: graphDeviceId,
                tenant: tenant._id
            });

            // device added succedfully, add deviceVersion
            if (addDeviceResponse && addDeviceResponse._id) {
                // create new device version element
                let addDeviceVersionResponse = await addDeviceVersion(deviceObjectFromGraph, addDeviceResponse._id, deviceObjectFromGraphVersion);
                response.message = deviceObjectFromGraph.deviceName + ": saved, new device"
            }
        }
        // ****
        // Existing Device
        // Device does already exist
        // ****
        else {
            let newestStoredDeviceVersion;
            let newestStoredDeviceVersionVersion = null;
            let device = devices[0];
            context.log("ACT3000AzureDataCollectHandleDevice", "device " + device._id + " already exists in table");

            // get newest versions of this device
            let newestStoredDeviceVersions = await DeviceVersion.find({ device: device._id, successorVersion: null });
            let storedDeviceVersions = await DeviceVersion.find({ device: device._id });

            // context.log(storedDeviceVersions);

            // check for object was found and the version property exists
            if (newestStoredDeviceVersions[0] && newestStoredDeviceVersions[0].version) {
                newestStoredDeviceVersion = newestStoredDeviceVersions[0];
                newestStoredDeviceVersionVersion = newestStoredDeviceVersions[0].version;
                // context.log("newest stored version: ", newestStoredDeviceVersion);
            } // else defaults to null

            // ****
            // New Device Version
            // New version found, need to add the new version
            // ****
            if (deviceObjectFromGraphVersion != newestStoredDeviceVersionVersion) {
                // context.log("configuration " + device.id + " new version found, add new device version");

                let addDeviceVersionResponse = await addDeviceVersion(deviceObjectFromGraph, device._id, deviceObjectFromGraphVersion);
                // context.log("new version: ", addDeviceVersionResponse);

                response.message = deviceObjectFromGraph.deviceName + ": saved, new device version"

                if (addDeviceVersionResponse && addDeviceVersionResponse._id) {
                    // set active configurationversion to old state if the objects exists
                    if (newestStoredDeviceVersion) {
                        newestStoredDeviceVersion.successorVersion = addDeviceVersionResponse._id;
                        newestStoredDeviceVersion.save();
                    }
                }

                // remove older versions
                if (storedDeviceVersions.length >= 5) {
                    // Todo: Cleanup
                }
            } else {
                response.message = deviceObjectFromGraph.deviceName + ": no change, device up to date"
            }
        }
        responses.push(response);
    }
    return responses;
}
export default activityFunction;