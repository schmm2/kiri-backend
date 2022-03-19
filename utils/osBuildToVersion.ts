// expected build number like 10.0.19042.508
const osBuildToVersion = (build) => {
    let buildArray = build.split('.');

    if (buildArray[2]) {
        switch (buildArray[2]) {
            case "22000": return "21H2";
            case "19044": return "21H2";
            case "19043": return "21H1";
            case "19042": return "20H2";
            case "19041": return "2004";
            case "18363": return "1909";
            case "17763": return "1809";
            case "14393": return "1607";
            case "10240": return "1507";
            default: return null;
        }
    }
    return null;
}
export {osBuildToVersion}