const findGraphDataTypeName = (configuration, graphResourceUrl): any => {
    let configurationTypeName = null

    if (configuration["@odata.type"]) {
        configurationTypeName = configuration["@odata.type"].replace("#microsoft.graph.", "");
    } else {
        // Graph Exceptions
        // Exception: Some resource do not contain a odata property (example: App Protection Policy)

        let graphResourceUrlArray = graphResourceUrl.split('/');
        configurationTypeName = graphResourceUrlArray[graphResourceUrlArray.length - 1];

        // Astetic changes to the DataType
        // we wish to store the type but only the singular form of the word
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

    return configurationTypeName
}

export { findGraphDataTypeName }