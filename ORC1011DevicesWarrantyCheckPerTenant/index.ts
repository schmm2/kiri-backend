import * as df from "durable-functions"
const functionName = "ORC1010DevicesWarrantyCheck"

const orchestrator = df.orchestrator(function* (context) {
    const output = [];
    const queryParameters: any = context.df.getInput();

    // precheck parameter
    if (queryParameters && queryParameters.tenantDbId) {
        let tenantDbId = queryParameters.tenantDbId;
        if (!context.df.isReplaying) context.log(functionName, "Tenant Mongo DB Id: " + tenantDbId);

        let devices = yield context.df.callActivity("ACT1080DeviceVersionNewestByTenantId", tenantDbId)
        if (!context.df.isReplaying) context.log(devices);

        // add dummy device for testing only
        let dummyDevice = {
            serialNumber: '5CG9247DW7',
            device: '61b7bb46336581f7995ed6b0',
            manufacturer: 'HP'
        }
        devices.push(dummyDevice)

        let dummyDevice2 = {
            serialNumber: 'S4ERL64',
            device: '61b7bb46336581f7995ed6b0',
            manufacturer: 'Lenovo'
        }
        devices.push(dummyDevice2)

        let tasks = []
        for (let d = 0; d < devices.length; d++) {
            const device = devices[d];
            const manufacturer = device.manufacturer
            // if (!context.df.isReplaying) context.log(functionName, manufacturer);

            switch (manufacturer) {
                case "HP":
                    // tasks.push(context.df.callActivity("ACT4000HPWarrantyCheck", { deviceId: device.device, serialNumber: device.serialNumber }))
                    break
                case "Lenovo":
                    tasks.push(context.df.callActivity("ACT4001LenovoWarrantyCheck", { deviceId: device.device, serialNumber: device.serialNumber }))
                    break
                default:
                    break
            }
        }
        const warrantyData = yield context.df.Task.all(tasks);
        if (!context.df.isReplaying) context.log(warrantyData);

    } else {
        if (!context.df.isReplaying) context.log(functionName, "invalid parameter");
    }
    return output;
});

export default orchestrator;
