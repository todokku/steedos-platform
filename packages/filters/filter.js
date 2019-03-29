const DevExpress = require("devextreme/bundles/modules/core");
const DevExpressData = require("devextreme/bundles/modules/data");
// const DevExpressOData = require("devextreme/bundles/modules/data.odata");
const getLDMLFormatter = require("./date.formatter").getFormatter;


DevExpressData.utils.isUnaryOperation = (crit) => {
    return crit[0] === "!" && Array.isArray(crit[1]);
}

const defaultDateNames = DevExpress.localization.date;

const DevExpressOData = {
    serializePropName(propName) {
        return propName.replace(/\./g, "/");
    },
    serializeValue(value, protocolVersion) {
        switch (protocolVersion) {
            case 2:
                return this.serializeValueV2(value);
            case 3:
                return this.serializeValueV2(value);
            case 4:
                return this.serializeValueV4(value);
            default: 
                return this.serializeValueV4(value);
        }
    },
    serializeValueV2(value) {
        if (value instanceof Date) {
            return this.serializeDate(value);
        }
        // if (value instanceof Guid) {
        //     return "guid'" + value + "'";
        // }
        // if (value instanceof EdmLiteral) {
        //     return value.valueOf();
        // }
        if (typeof value === "string") {
            return this.serializeString(value);
        }
        return String(value);
    },
    serializeValueV4(value) {
        if (value instanceof Date) {
            return this.formatISO8601(value, false, false);
        }
        // if (value instanceof Guid) {
        //     return value.valueOf();
        // }
        if (Array.isArray(value)) {
            return "[" + value.map(function (item) {
                return this.serializeValueV4(item);
            }).join(",") + "]";
        }
        return this.serializeValueV2(value);
    }, 
    serializeString(value) {
        return "'" + value.replace(/'/g, "''") + "'";
    },
    serializeDate(value, serializationFormat) {
        if (!serializationFormat) {
            return value;
        }

        if (!(value instanceof Date)) {
            return null;
        }

        if (serializationFormat === "number") {
            return value && value.valueOf ? value.valueOf() : null;
        }

        return getLDMLFormatter(serializationFormat, defaultDateNames)(value);
    },
    formatISO8601(date, skipZeroTime, skipTimezone) {
        var bag = [];

        var isZeroTime = function () {
            return date.getHours() + date.getMinutes() + date.getSeconds() + date.getMilliseconds() < 1;
        };

        bag.push(date.getFullYear());
        bag.push("-");
        bag.push(this.padLeft2(date.getMonth() + 1));
        bag.push("-");
        bag.push(this.padLeft2(date.getDate()));

        if (!(skipZeroTime && isZeroTime())) {
            bag.push("T");
            bag.push(this.padLeft2(date.getHours()));
            bag.push(":");
            bag.push(this.padLeft2(date.getMinutes()));
            bag.push(":");
            bag.push(this.padLeft2(date.getSeconds()));

            if (date.getMilliseconds()) {
                bag.push(".");
                bag.push(this.pad(date.getMilliseconds(), 3));
            }

            if (!skipTimezone) {
                bag.push("Z");
            }
        }

        return bag.join("");
    }
};


class SteedosFilter {

    constructor(filters, odataProtocolVersion = 4, forceLowerCase = true){
        this.filters = filters || [];
        this.protocolVersion = odataProtocolVersion;
        this.forceLowerCase = forceLowerCase;
        this.formatters = {
            "=": this.createBinaryOperationFormatter("eq"),
            "<>": this.createBinaryOperationFormatter("ne"),
            ">": this.createBinaryOperationFormatter("gt"),
            ">=": this.createBinaryOperationFormatter("ge"),
            "<": this.createBinaryOperationFormatter("lt"),
            "<=": this.createBinaryOperationFormatter("le"),
            "startswith": this.createStringFuncFormatter("startswith"),
            "endswith": this.createStringFuncFormatter("endswith")
        };
        this.formattersV2 = {...this.formatters, ...{
                "contains": this.createStringFuncFormatter("substringof", true),
                "notcontains": this.createStringFuncFormatter("not substringof", true)
            }
        };
        this.formattersV4 = {
            ...this.formatters, ...{
                "contains": this.createStringFuncFormatter("contains"),
                "notcontains": this.createStringFuncFormatter("not contains")
            }
        };
    }

    createBinaryOperationFormatter(op) {
        return (prop, val)=> {
            return prop + " " + op + " " + val;
        };
    }

    createStringFuncFormatter(op, reverse) {
        return (prop, val)=> {
            var bag = [op, "("];

            if (this.forceLowerCase) {
                prop = prop.indexOf("tolower(") === -1 ? "tolower(" + prop + ")" : prop;
                val = val.toLowerCase();
            }

            if (reverse) {
                bag.push(val, ",", prop);
            } else {
                bag.push(prop, ",", val);
            }

            bag.push(")");
            return bag.join("");
        };
    }

    // private isUnaryOperation(crit: any[]): boolean{
    //     return crit[0] === "!" && Array.isArray(crit[1]);
    // }

    // private isConjunctiveOperator(condition: string): boolean {
    //     return /^(and|&&|&)$/i.test(condition);
    // }

    // private serializePropName(propName: string): string {
    //     return propName.replace(/\./g, "/");
    // }

    // private serializeDate(value: any, serializationFormat?: any): any {
    //     if (!serializationFormat) {
    //         return value;
    //     }

    //     if (!(value instanceof Date)) {
    //         return null;
    //     }

    //     if (serializationFormat === "number") {
    //         return value && value.valueOf ? value.valueOf() : null;
    //     }

    //     return getLDMLFormatter(serializationFormat, defaultDateNames)(value);
    // }

    // private serializeString(value: string): string {
    //     return "'" + value.replace(/'/g, "''") + "'";
    // }

    // private serializeValue(value: any, protocolVersion: number): any {
    //     switch (protocolVersion) {
    //         case 2:
    //             return this.serializeValueV2(value);
    //         case 3:
    //             return this.serializeValueV2(value);
    //         case 4:
    //             return this.serializeValueV4(value);
    //         default: 
    //             return this.serializeValueV4(value);
    //     }
    // }

    // private pad(text: any, length?: any, right?: any): string {
    //     text = String(text);
    //     while (text.length < length) {
    //         text = right ? (text + "0") : ("0" + text);
    //     }
    //     return text;
    // }

    // private padLeft2(text: any): string {
    //     return this.pad(text, 2);
    // }

    // private formatISO8601(date: Date, skipZeroTime: boolean, skipTimezone: boolean): string {
    //     var bag = [];

    //     var isZeroTime = function () {
    //         return date.getHours() + date.getMinutes() + date.getSeconds() + date.getMilliseconds() < 1;
    //     };

    //     bag.push(date.getFullYear());
    //     bag.push("-");
    //     bag.push(this.padLeft2(date.getMonth() + 1));
    //     bag.push("-");
    //     bag.push(this.padLeft2(date.getDate()));

    //     if (!(skipZeroTime && isZeroTime())) {
    //         bag.push("T");
    //         bag.push(this.padLeft2(date.getHours()));
    //         bag.push(":");
    //         bag.push(this.padLeft2(date.getMinutes()));
    //         bag.push(":");
    //         bag.push(this.padLeft2(date.getSeconds()));

    //         if (date.getMilliseconds()) {
    //             bag.push(".");
    //             bag.push(this.pad(date.getMilliseconds(), 3));
    //         }

    //         if (!skipTimezone) {
    //             bag.push("Z");
    //         }
    //     }

    //     return bag.join("");
    // }

    // private serializeValueV2(value: any): any {
    //     if (value instanceof Date) {
    //         return this.serializeDate(value);
    //     }
    //     // if (value instanceof Guid) {
    //     //     return "guid'" + value + "'";
    //     // }
    //     // if (value instanceof EdmLiteral) {
    //     //     return value.valueOf();
    //     // }
    //     if (typeof value === "string") {
    //         return this.serializeString(value);
    //     }
    //     return String(value);
    // }

    // private serializeValueV4(value: any): any {
    //     if (value instanceof Date) {
    //         return this.formatISO8601(value, false, false);
    //     }
    //     // if (value instanceof Guid) {
    //     //     return value.valueOf();
    //     // }
    //     if (Array.isArray(value)) {
    //         return "[" + value.map(function (item) {
    //             return this.serializeValueV4(item);
    //         }).join(",") + "]";
    //     }
    //     return this.serializeValueV2(value);
    // }

    // private normalizeBinaryCriterion(crit: any[]): any[] {
    //     return [
    //         crit[0],
    //         crit.length < 3 ? "=" : String(crit[1]).toLowerCase(),
    //         crit.length < 2 ? true : crit[crit.length - 1]
    //     ];
    // }

    compileUnary(criteria) {
        var op = criteria[0],
            crit = this.compileCore(criteria[1]);

        if (op === "!") {
            return "not (" + crit + ")";
        }
        throw new Error("E4003");
    }

    compileGroup(criteria) {
        var bag = [],
            groupOperator,
            nextGroupOperator;

        criteria.forEach((criterion) => {
            if (Array.isArray(criterion)) {

                if (bag.length > 1 && groupOperator !== nextGroupOperator) {
                    throw new Error("E4019");
                }

                bag.push("(" + this.compileCore(criterion) + ")");

                groupOperator = nextGroupOperator;
                nextGroupOperator = "and";
            } else {
                nextGroupOperator = DevExpressData.utils.isConjunctiveOperator(criterion) ? "and" : "or";
            }
        })

        return bag.join(" " + groupOperator + " ");
    }

    compileBinary(criteria){
        criteria = DevExpressData.utils.normalizeBinaryCriterion(criteria);

        var op = criteria[1],
            formatters = this.protocolVersion === 4
                ? this.formattersV4
                : this.formattersV2,
            formatter = formatters[op.toLowerCase()];

        if (!formatter) {
            throw new Error("E4003");
        }

        var fieldName = criteria[0],
            value = criteria[2];

        return formatter(
            DevExpressOData.serializePropName(fieldName),
            DevExpressOData.serializeValue(value, this.protocolVersion)
        );
    }

    compileCore(criteria) {
        if (Array.isArray(criteria[0])) {
            return this.compileGroup(criteria);
        }

        if (DevExpressData.utils.isUnaryOperation(criteria)) {
            return this.compileUnary(criteria);
        }

        return this.compileBinary(criteria);
    }
    
    formatFiltersToODataQuery() {
        // 转换filters为odata串
        let filters = this.filters;
        let query = this.compileCore(filters);
        return query;
    }
}

let formatFiltersToODataQuery = (filters, odataProtocolVersion, forceLowerCase)=>{
    return new SteedosFilter(filters, odataProtocolVersion, forceLowerCase).formatFiltersToODataQuery();
}


exports.SteedosFilter = SteedosFilter;
exports.formatFiltersToODataQuery = formatFiltersToODataQuery;