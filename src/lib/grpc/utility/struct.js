// Convert JavaScript value to protobuf Value
function jsToValue(value) {
    if (value === null || value === undefined) {
        return { kind: "nullValue", nullValue: 0 };
    }

    if (value instanceof Date) {
        return { kind: "stringValue", stringValue: value.toISOString() };
    }

    if (Array.isArray(value)) {
        return {
            kind: "listValue",
            listValue: { values: value.map(jsToValue) },
        };
    }

    switch (typeof value) {
        case "string":
            return { kind: "stringValue", stringValue: value };
        case "number":
            return { kind: "numberValue", numberValue: value };
        case "boolean":
            return { kind: "boolValue", boolValue: value };
        case "object":
            return { kind: "structValue", structValue: jsToStruct(value) };
        default:
            return { kind: "stringValue", stringValue: String(value) };
    }
}

// Convert JavaScript object to protobuf Struct
function jsToStruct(obj) {
    const fields = {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return { fields };
    }

    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;
        fields[key] = jsToValue(value);
    }

    return { fields };
}

module.exports = { jsToStruct };

