import * as df from "durable-functions"
const functionName = "ORC1010DevicesWarrantyCheck"

const orchestrator = df.orchestrator(function* (context) {
    const output = [];
    const queryParameters: any = context.df.getInput();

    // precheck parameter
    if (queryParameters && queryParameters.tenantDbId) {
        let tenantDbId = queryParameters.tenantDbId;
        if (!context.df.isReplaying) context.log(functionName, "Tenant Mongo DB Id: " + tenantDbId);

        // Create Job
        let jobData = {
            type: "QUERY_DEVICEWARRANTY",
            state: "STARTED",
            tenant: tenantDbId
        };
        let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

        // figure out for which devices we need to query warranty information
        let devices = yield context.df.callActivity("ACT1090DeviceByTenantId", tenantDbId)
        let devicesWithoutWarrantyInfo = devices.filter((device) => device.deviceWarrenty == null)
        let devicesWithoutWarrantyInfoIds = devicesWithoutWarrantyInfo.map(device => device._id)
        job.log.push({ message: 'found ' + devicesWithoutWarrantyInfoIds.length + ' devices without warranty data', state: "DEFAULT" });

        // get version object of devices
        let newestDeviceVersions = yield context.df.callActivity("ACT1081DeviceVersionNewestByDeviceIds", devicesWithoutWarrantyInfoIds)
        //context.log(newestDeviceVersions);

        // *******
        // Query Vendor APIS for Warranty Data
        // *******
        let queryWarrantyTasks = []
        for (let d = 0; d < newestDeviceVersions.length; d++) {
            const device = newestDeviceVersions[d];
            const manufacturer = device.manufacturer
            // if (!context.df.isReplaying) context.log(functionName, manufacturer);

            switch (manufacturer) {
                case "HP":
                    // queryWarrantyTasks.push(context.df.callActivity("ACT4000HPWarrantyCheck", { deviceDbId: device.device, serialNumber: device.serialNumber }))
                    break
                case "Lenovo":
                    queryWarrantyTasks.push(context.df.callActivity("ACT4001LenovoWarrantyCheck", { deviceDbId: device.device, serialNumber: device.serialNumber }))
                    break
                case "Microsoft Corporation":
                    queryWarrantyTasks.push(context.df.callActivity("ACT4002MicrosoftWarrantyCheck", { deviceDbId: device.device, serialNumber: device.serialNumber }))
                    break
                default:
                    break
            }
        }
        // ******************
        // Store Data in DB
        // ******************
        if (queryWarrantyTasks.length > 0) {
            const warrantyData = yield context.df.Task.all(queryWarrantyTasks);
            job.log.push({ message: 'queried ' + queryWarrantyTasks.length + ' serialNumbers for known vendors', state: "SUCCESS" });

            // store the warrantyData in DB
            let storeWarrantyTasks = [];
            for (let w = 0; w < warrantyData.length; w++) {
                const warrantyObject = warrantyData[w];
                storeWarrantyTasks.push(context.df.callActivity("ACT1100DeviceWarrantyCreate", warrantyObject))
            }
            if (storeWarrantyTasks.length > 0) {
                yield context.df.Task.all(storeWarrantyTasks);
                job.log.push({ message: 'stored ' + storeWarrantyTasks.length + ' warrantyData in DB', state: "SUCCESS" });
            }
        }
        job.state = 'FINISHED'
        yield context.df.callActivity("ACT1021JobUpdate", job);
    } else {
        if (!context.df.isReplaying) context.log(functionName, "invalid parameter");
    }
    return output;
});

export default orchestrator;
