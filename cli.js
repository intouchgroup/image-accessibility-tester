#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
var program = require('commander');
var sharp = require('sharp');
var crypto_1 = require("crypto");
var chalk_1 = require("chalk");
var http = require("http");
var https = require("https");
var filesystem = require("fs");
var CONCURRENT_REQUESTS_DEFAULT = 5;
var REPORT_FILENAME_SUFFIX_DEFAULT = 'images';
var USER_AGENT_DEFAULT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36';
var URL_PROTOCOL_REGEX = /^(?:f|ht)tps?\:\/\//;
var URL_HTTPS_PROTOCOL_REGEX = /^https:\/\//;
var URL_VALIDATION_REGEX = /^((?:f|ht)tps?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;
var IMAGE_ELEMENT_REGEX = /<img[\w\W]+?>/g;
var SRC_ATTRIBUTE_CAPTURE_REGEX = /src=([^\s]+)/;
var ALT_ATTRIBUTE_CAPTURE_REGEX = /alt=([^\s]+)/;
var TITLE_ATTRIBUTE_CAPTURE_REGEX = /title=([^\s]+)/;
var ROLE_ATTRIBUTE_CAPTURE_REGEX = /role=([^\s]+)/;
var LONGDESC_ATTRIBUTE_CAPTURE_REGEX = /longdesc=([^\s]+)/;
var ARIA_GLOBAL_ATTRIBUTE_CAPTURE_REGEX = /aria-[a-zA-Z]+=([^\s]+)/g;
var IMAGE_TYPE_SVG_REGEX = /\.svg/;
var SVG_TO_PNG_DENSITY_DEFAULT = 400;
var redirectReport = [];
var didError = false;
program
    .option('-s, --sites <urls>', 'Comma-delimited list of URLs to check images', function (string) { return string.split(','); }, [])
    .option('-p, --prefix <prefix>', 'Prefix to be applied to all sites without a protocol')
    .option('-r, --protocol <protocol>', 'Protocol to be applied to all sites without a protocol')
    .option('-a, --auth <username:password>', 'Provide a username and password for authentication')
    .option('-n, --concurrent <number>', 'Number of request to make concurrently. Defaults to 5')
    .option('-j, --json', 'Generates JSON reports')
    .option('-x, --xlsx', 'Generates XLSX reports')
    .option('-f, --filename <filename>', 'Set the name of the generated report file')
    .parse(process.argv);
var log = {
    missingInputURLs: function () {
        console.error(chalk_1.red("\n    ERROR: No site URLs were given.\n    Please make sure to include URLs with -s or --sites: " + chalk_1.magenta('image-accessibility-tester -s google.com,facebook.com') + "\n"));
    },
    failedToParseAuth: function () {
        console.error(chalk_1.red("\n    ERROR: Could not parse auth option (username and password), please check the format:\n    " + chalk_1.magenta('redirect-tester -s example.com -a username:password') + "\n"));
    },
    noReportsBeingCreated: function () {
        console.warn(chalk_1.yellow('\n    WARNING: No reports are being created. Use the --json or --xlsx options to generate reports.'));
    },
    prefixWarning: function (missingPrefixURLs) {
        console.warn(chalk_1.yellow('\n    WARNING: Some input URLs did not have a protocol, and no prefix was provided:\n'));
        missingPrefixURLs.forEach(function (_a) {
            var inputURL = _a.inputURL, inputIndex = _a.inputIndex;
            return console.log(chalk_1.yellow("    " + (inputIndex + 1) + ". " + inputURL));
        });
    },
    invalidError: function (invalidURLs) {
        didError = true;
        console.error(chalk_1.red('\n    ERROR: Some input URLs were invalid:\n'));
        invalidURLs.forEach(function (_a) {
            var inputURL = _a.inputURL, inputIndex = _a.inputIndex;
            return console.log(chalk_1.red("    " + (inputIndex + 1) + ". " + inputURL));
        });
    },
    requestError: function (_a, inputIndex) {
        var error = _a.error, url = _a.url;
        didError = true;
        console.error(chalk_1.red('\n    ERROR: An error occurred during the URL request:'));
        console.log(chalk_1.red("    " + (inputIndex !== undefined ? inputIndex + 1 + "." : undefined), url));
        console.log(chalk_1.red("    ", error));
    },
    missingTargetResult: function (_a) {
        var guid = _a.guid, url = _a.url;
        didError = true;
        console.error(chalk_1.red('\n    ERROR: Missing targetResult when searching by GUID. This should not happen.\n    Please contact a developer and provide the following information:\n'));
        console.log(chalk_1.magenta("    targetResult guid = " + guid + "\n"));
        console.log(chalk_1.magenta("    targetResult url = " + url + "\n"));
    },
    someRequestsPruned: function () {
        console.warn(chalk_1.yellow('\n    WARNING: Some URLs did not result in a status code of 200.\n    Images will not be retrieved from these URLs:\n'));
        redirectReport.forEach(function (_a) {
            var responses = _a.responses, inputIndex = _a.inputIndex, inputURL = _a.inputURL;
            var _b = responses[responses.length - 1], error = _b.error, statusCode = _b.statusCode;
            if (error || !statusCode || (statusCode && statusCode !== 200)) {
                console.log(chalk_1.yellow("\n    " + inputIndex + ". " + inputURL));
                console.log(chalk_1.yellow("    Status Code: " + statusCode + ", Error: " + error));
            }
        });
    },
    writingToDisk: function (report, json, xlsx) {
        console.log(chalk_1.white("\n\n    Generating report types:\n    ---------------------------------------------------\n    " + (json ? chalk_1.green('✓') : chalk_1.red('x')) + " JSON    " + (xlsx ? chalk_1.green('✓') : chalk_1.red('x')) + " XLSX\n\n\n    Processing " + chalk_1.cyan(report.length) + " URLs: \n    ---------------------------------------------------"));
        report.forEach(function (_a, index) {
            var url = _a.url;
            return console.log("    " + chalk_1.cyan(index + 1 + ".") + " " + chalk_1.white(url));
        });
        console.log('\n');
    },
    errorWritingToDisk: function (error, json, xlsx) {
        didError = true;
        console.error(chalk_1.red("\n    ERROR: Error writing " + (json ? 'JSON' : xlsx ? 'XLSX' : '') + " report to disk:", error));
    },
    wroteToDisk: function (jsonFilenames, xlsxFilenames, json, xlsx) {
        if (json) {
            console.log(chalk_1.white("\n    Wrote JSON report(s) to disk:\n"));
            jsonFilenames.forEach(function (filename, index) { return console.log(chalk_1.white("        " + (index + 1) + ". " + chalk_1.cyan(filename))); });
            console.log('\n');
        }
        if (xlsx) {
            if (!json) {
                console.log('\n');
            }
            console.log(chalk_1.white("    Wrote XLSX report(s) to disk:\n"));
            xlsxFilenames.forEach(function (filename, index) { return console.log(chalk_1.white("        " + (index + 1) + ". " + chalk_1.cyan(filename))); });
            console.log('\n');
        }
    },
    programDidError: function () {
        console.error(chalk_1.red('\n    ERROR: At least one error occurred while the tool was running.\n    However, the report was able to be completed.\n    Please review the console for any error messages.\n'));
    }
};
var validateURLs = function (inputURLs) {
    var validURLs = [];
    var invalidURLs = [];
    inputURLs.forEach(function (inputURL, index) {
        var urlObject = { inputIndex: index, inputURL: inputURL };
        if (URL_VALIDATION_REGEX.test(inputURL)) {
            validURLs.push(urlObject);
        }
        else {
            invalidURLs.push(urlObject);
        }
    });
    if (invalidURLs.length) {
        log.invalidError(invalidURLs);
    }
    return validURLs;
};
var generateRequests = function (validURLs, protocol, prefix) {
    var missingPrefixURLs = [];
    var requests = validURLs.map(function (_a) {
        var inputURL = _a.inputURL, inputIndex = _a.inputIndex;
        var url;
        if (URL_PROTOCOL_REGEX.test(inputURL)) {
            url = new URL(inputURL).href;
        }
        else {
            missingPrefixURLs.push({ inputURL: inputURL, inputIndex: inputIndex });
            url = new URL((protocol ? protocol : 'https://') + (prefix ? prefix : '') + inputURL).href;
        }
        return {
            guid: generateGuid(),
            url: url,
            inputURL: inputURL,
            inputIndex: inputIndex
        };
    });
    if (missingPrefixURLs.length > 0 && !prefix) {
        log.prefixWarning(missingPrefixURLs);
    }
    return requests;
};
var generateGuid = function () {
    var placeholder = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11);
    var guid = placeholder.replace(/[018]/g, function (character) {
        var randomNumber = (crypto_1.randomFillSync(new Uint8Array(1))[0] & 15) >> (character / 4);
        var randomString = (character ^ randomNumber).toString(16);
        return randomString;
    });
    return guid;
};
var chunk = function (items, batchSize) {
    var length = items.length;
    var chunks = [];
    for (var i = 0; i < length; i += batchSize) {
        chunks.push(items.slice(i, i + batchSize));
    }
    return chunks;
};
var performBatchAsyncDataRequests = function (requests, auth) {
    return Promise.all(requests.map(function (_a) {
        var url = _a.url, rest = __rest(_a, ["url"]);
        return new Promise(function (resolve) {
            try {
                var protocolAdapter_1 = URL_HTTPS_PROTOCOL_REGEX.test(url) ? https : http;
                protocolAdapter_1.get(url, { headers: { 'User-Agent': USER_AGENT_DEFAULT } }, function (response) {
                    var statusCode = response.statusCode;
                    if (statusCode === 401 && auth) {
                        protocolAdapter_1.get(url, {
                            headers: {
                                'User-Agent': USER_AGENT_DEFAULT,
                                'Authorization': 'Basic ' + Buffer.from(auth).toString('base64')
                            }
                        }, function (response) {
                            var statusCode = response.statusCode;
                            var chunks = [];
                            response.on('data', function (chunk) { return chunks.push(chunk); });
                            response.on('end', function () { return resolve(__assign(__assign({}, rest), { url: url, statusCode: statusCode, data: chunks.join('') })); });
                        }).on('error', function (error) { return resolve(__assign(__assign({}, rest), { url: url, error: error })); });
                    }
                    else {
                        var chunks_1 = [];
                        response.on('data', function (chunk) { return chunks_1.push(chunk); });
                        response.on('end', function () { return resolve(__assign(__assign({}, rest), { url: url, statusCode: statusCode, data: chunks_1.join('') })); });
                    }
                }).on('error', function (error) { return resolve(__assign(__assign({}, rest), { url: url, error: error })); });
            }
            catch (error) {
                resolve(__assign(__assign({}, rest), { url: url, error: error }));
            }
        });
    }));
};
var performBatchAsyncRequests = function (requests, auth) {
    return Promise.all(requests.map(function (_a) {
        var url = _a.url, rest = __rest(_a, ["url"]);
        return new Promise(function (resolve) {
            try {
                var protocolAdapter_2 = URL_HTTPS_PROTOCOL_REGEX.test(url) ? https : http;
                protocolAdapter_2.get(url, { headers: { 'User-Agent': USER_AGENT_DEFAULT } }, function (_a) {
                    var statusCode = _a.statusCode, headers = _a.headers;
                    if (statusCode === 401 && auth) {
                        protocolAdapter_2.get(url, {
                            headers: {
                                'User-Agent': USER_AGENT_DEFAULT,
                                'Authorization': 'Basic ' + Buffer.from(auth).toString('base64')
                            }
                        }, function (_a) {
                            var statusCode = _a.statusCode, headers = _a.headers;
                            return resolve(__assign(__assign({}, rest), { url: url, statusCode: statusCode, location: headers && headers.location }));
                        }).on('error', function (error) { return resolve(__assign(__assign({}, rest), { url: url, error: error })); });
                    }
                    else {
                        resolve(__assign(__assign({}, rest), { url: url, statusCode: statusCode, location: headers && headers.location }));
                    }
                }).on('error', function (error) { return resolve(__assign(__assign({}, rest), { url: url, error: error })); });
            }
            catch (error) {
                resolve(__assign(__assign({}, rest), { url: url, error: error }));
            }
        });
    }));
};
var batchCheckRedirects = function (requests, numberOfConcurrentRequests, auth) { return __awaiter(void 0, void 0, void 0, function () {
    var requestChunks, chunkedResults, _i, requestChunks_1, chunk_1, _a, _b, results;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                requestChunks = chunk(requests, numberOfConcurrentRequests);
                chunkedResults = [];
                _i = 0, requestChunks_1 = requestChunks;
                _c.label = 1;
            case 1:
                if (!(_i < requestChunks_1.length)) return [3 /*break*/, 4];
                chunk_1 = requestChunks_1[_i];
                _b = (_a = chunkedResults).push;
                return [4 /*yield*/, performBatchAsyncRequests(chunk_1, auth)];
            case 2:
                _b.apply(_a, [_c.sent()]);
                _c.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                results = chunkedResults.reduce(function (accumulator, value) { return accumulator.concat(value); }, []);
                return [2 /*return*/, results];
        }
    });
}); };
var updateRedirectReport = function (results) {
    results.forEach(function (result) {
        var targetBaseURL = redirectReport.find(function (_a) {
            var guid = _a.guid;
            return guid === result.guid;
        });
        if (result.hasOwnProperty('error')) {
            log.requestError(result, targetBaseURL ? targetBaseURL.inputIndex : undefined);
        }
        if (targetBaseURL) {
            targetBaseURL.responses.push(result);
        }
        else {
            log.missingTargetResult(result);
        }
    });
};
var recursivelyCheckRedirectsAndUpdateReport = function (requests, numberOfConcurrentRequests, auth) { return __awaiter(void 0, void 0, void 0, function () {
    var results, redirects, nextRequests;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, batchCheckRedirects(requests, numberOfConcurrentRequests, auth)];
            case 1:
                results = _a.sent();
                updateRedirectReport(results);
                redirects = results.filter(function (_a) {
                    var statusCode = _a.statusCode, location = _a.location;
                    return statusCode && location && statusCode >= 300 && statusCode < 400;
                });
                if (!redirects.length) return [3 /*break*/, 3];
                nextRequests = redirects.map(function (_a) {
                    var guid = _a.guid, location = _a.location;
                    return ({ guid: guid, url: location });
                });
                return [4 /*yield*/, recursivelyCheckRedirectsAndUpdateReport(nextRequests, numberOfConcurrentRequests, auth)];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); };
var performBatchAsyncGetImages = function (imageURLs, auth) {
    return Promise.all(imageURLs.map(function (url) {
        return new Promise(function (resolve) {
            try {
                var protocolAdapter_3 = URL_HTTPS_PROTOCOL_REGEX.test(url) ? https : http;
                protocolAdapter_3.get(url, { headers: { 'User-Agent': USER_AGENT_DEFAULT } }, function (response) {
                    var statusCode = response.statusCode;
                    if (statusCode === 401 && auth) {
                        protocolAdapter_3.get(url, {
                            headers: {
                                'User-Agent': USER_AGENT_DEFAULT,
                                'Authorization': 'Basic ' + Buffer.from(auth).toString('base64')
                            }
                        }, function (response) {
                            var chunks = [];
                            response.on('data', function (chunk) { return chunks.push(chunk); });
                            response.on('end', function () { return resolve(Buffer.concat(chunks)); });
                        }).on('error', function (error) { return resolve(error); });
                    }
                    else {
                        var chunks_2 = [];
                        response.on('data', function (chunk) { return chunks_2.push(chunk); });
                        response.on('end', function () { return resolve(Buffer.concat(chunks_2)); });
                    }
                }).on('error', function (error) { return resolve(error); });
            }
            catch (error) {
                resolve(error);
            }
        });
    }));
};
var trimQuotations = function (string) {
    var firstChar = string.charAt(0);
    var lastChar = string.charAt(string.length - 1);
    if (firstChar === '\'' || firstChar === '"') {
        string = string.substr(1, string.length - 1);
    }
    if (lastChar === '\'' || lastChar === '"') {
        string = string.substr(0, string.length - 1);
    }
    return string;
};
var checkIfMatched = function (regexpMatch) { return regexpMatch && regexpMatch.length >= 1 ? true : false; };
var getFirstMatchingGroup = function (regexpMatch) { return regexpMatch && regexpMatch.length >= 2 ? regexpMatch[1] : null; };
var getTrimmedMatchingGroupValue = function (didMatch, matchingGroup) { return didMatch && matchingGroup ? trimQuotations(matchingGroup) : ''; };
var evaluateImages = function (reportData) {
    return reportData.map(function (_a) {
        var url = _a.url, images = _a.images, rest = __rest(_a, ["url", "images"]);
        var domain = new URL(url).origin;
        var processedImages = images.map(function (imageString) {
            var srcMatch = imageString.match(SRC_ATTRIBUTE_CAPTURE_REGEX);
            var hasSrc = checkIfMatched(srcMatch);
            var srcMatchingGroup = getFirstMatchingGroup(srcMatch);
            var src = getTrimmedMatchingGroupValue(hasSrc, srcMatchingGroup);
            var altMatch = imageString.match(ALT_ATTRIBUTE_CAPTURE_REGEX);
            var hasAlt = checkIfMatched(altMatch);
            var altMatchingGroup = getFirstMatchingGroup(altMatch);
            var alt = getTrimmedMatchingGroupValue(hasAlt, altMatchingGroup);
            var titleMatch = imageString.match(TITLE_ATTRIBUTE_CAPTURE_REGEX);
            var hasTitle = checkIfMatched(titleMatch);
            var titleMatchingGroup = getFirstMatchingGroup(titleMatch);
            var title = getTrimmedMatchingGroupValue(hasTitle, titleMatchingGroup);
            var roleMatch = imageString.match(ROLE_ATTRIBUTE_CAPTURE_REGEX);
            var hasRole = checkIfMatched(roleMatch);
            var roleMatchingGroup = getFirstMatchingGroup(roleMatch);
            var role = getTrimmedMatchingGroupValue(hasRole, roleMatchingGroup);
            var longdescMatch = imageString.match(LONGDESC_ATTRIBUTE_CAPTURE_REGEX);
            var hasLongdesc = checkIfMatched(longdescMatch);
            var longdescMatchingGroup = getFirstMatchingGroup(longdescMatch);
            var longdesc = getTrimmedMatchingGroupValue(hasLongdesc, longdescMatchingGroup);
            var ariaMatches = imageString.match(ARIA_GLOBAL_ATTRIBUTE_CAPTURE_REGEX);
            var hasArias = checkIfMatched(ariaMatches);
            var arias = [];
            if (ariaMatches) {
                ariaMatches.forEach(function (match) { return arias.push(match); });
            }
            var absoluteURL = src.includes(domain) ? src : domain + src;
            return {
                hasSrc: hasSrc,
                src: src,
                hasAlt: hasAlt,
                alt: alt,
                hasTitle: hasTitle,
                title: title,
                hasArias: hasArias,
                arias: arias,
                hasRole: hasRole,
                role: role,
                hasLongdesc: hasLongdesc,
                longdesc: longdesc,
                absoluteURL: absoluteURL
            };
        });
        return __assign(__assign({}, rest), { url: url, images: processedImages });
    });
};
var generateReportFilename = function (url, fileExtension) {
    var urlName = url.replace(/^https?:\/\//, '').replace(/[\/\?#:\*\$@\!\.]/g, '_');
    var today = new Date();
    var timestamp = today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate() + "-" + today.getHours() + today.getMinutes() + today.getSeconds();
    return timestamp + "_" + urlName + (urlName.charAt(urlName.length - 1) === '_' ? '' : '_') + REPORT_FILENAME_SUFFIX_DEFAULT + "." + fileExtension;
};
var createExcelWorkbook = function (reportItem, concurrentNumber, auth) { return __awaiter(void 0, void 0, void 0, function () {
    var url, inputIndex, inputURL, images, xl, workBook, workSheet, headerStyle, asideStyle, valueStyle, textWrapStyle, greyBackgroundStyle, headers, headersLength, imageChunks, chunkedImageResults, _i, imageChunks_1, imageChunk, _a, _b, imageResults, pngImageResults;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                url = reportItem.url, inputIndex = reportItem.inputIndex, inputURL = reportItem.inputURL, images = reportItem.images;
                xl = require('excel4node');
                workBook = new xl.Workbook();
                workSheet = workBook.addWorksheet('Sheet 1');
                headerStyle = workBook.createStyle({ fill: { type: 'pattern', patternType: 'solid', fgColor: '#5595D0' }, font: { color: '#FAFAFA', size: 16, bold: true } });
                asideStyle = workBook.createStyle({ font: { color: '#030308', size: 16, bold: true } });
                valueStyle = workBook.createStyle({ font: { color: '#030308', size: 12 } });
                textWrapStyle = workBook.createStyle({ alignment: { wrapText: true } });
                greyBackgroundStyle = workBook.createStyle({ fill: { type: 'pattern', patternType: 'solid', fgColor: '#CFCFCF' } });
                headers = [
                    ['Source', 70],
                    ['Preview', 55],
                    ['Has Alt', 15],
                    ['Alt Value', 20],
                    ['Has Title', 15],
                    ['Title Value', 20],
                    ['Has Arias', 15],
                    ['Aria Values', 20],
                    ['Has Role', 15],
                    ['Role Value', 20],
                    ['Has Longdesc', 15],
                    ['Longdesc Value', 20],
                    ['Absolute URL', 70],
                ];
                headers.forEach(function (_a, index) {
                    var string = _a[0], width = _a[1];
                    workSheet.cell(1, index + 1).string(string).style(headerStyle);
                    workSheet.column(index + 1).setWidth(width);
                });
                headersLength = headers.length;
                workSheet.cell(1, headersLength + 2).string('URL: ').style(asideStyle);
                workSheet.cell(1, headersLength + 3).string(String(url)).style(valueStyle);
                workSheet.cell(2, headersLength + 2).string('Input URL: ').style(asideStyle);
                workSheet.cell(2, headersLength + 3).string(String(inputURL)).style(valueStyle);
                workSheet.cell(3, headersLength + 2).string('Input Index: ').style(asideStyle);
                workSheet.cell(3, headersLength + 3).string(String(inputIndex)).style(valueStyle);
                workSheet.cell(4, headersLength + 2).string('Image Count: ').style(asideStyle);
                workSheet.cell(4, headersLength + 3).string(String(images.length)).style(valueStyle);
                workSheet.column(headersLength + 2).setWidth(20);
                workSheet.column(headersLength + 3).setWidth(25);
                images.forEach(function (_a, imageIndex) {
                    var src = _a.src, hasAlt = _a.hasAlt, alt = _a.alt, hasTitle = _a.hasTitle, title = _a.title, hasArias = _a.hasArias, arias = _a.arias, hasRole = _a.hasRole, role = _a.role, hasLongdesc = _a.hasLongdesc, longdesc = _a.longdesc, absoluteURL = _a.absoluteURL;
                    var rowNumber = imageIndex + 2;
                    workSheet.cell(rowNumber, 1).string(src).style(valueStyle).style(textWrapStyle);
                    workSheet.cell(rowNumber, 2).style(greyBackgroundStyle);
                    workSheet.cell(rowNumber, 3).string(String(hasAlt)).style(valueStyle);
                    workSheet.cell(rowNumber, 4).string(alt).style(valueStyle);
                    workSheet.cell(rowNumber, 5).string(String(hasTitle)).style(valueStyle);
                    workSheet.cell(rowNumber, 6).string(title).style(valueStyle);
                    workSheet.cell(rowNumber, 7).string(String(hasArias)).style(valueStyle);
                    workSheet.cell(rowNumber, 8).string(String(arias)).style(valueStyle);
                    workSheet.cell(rowNumber, 9).string(String(hasRole)).style(valueStyle);
                    workSheet.cell(rowNumber, 10).string(role).style(valueStyle);
                    workSheet.cell(rowNumber, 11).string(String(hasLongdesc)).style(valueStyle);
                    workSheet.cell(rowNumber, 12).string(longdesc).style(valueStyle);
                    workSheet.cell(rowNumber, 13).string(absoluteURL).style(valueStyle).style(textWrapStyle);
                    workSheet.row(rowNumber).setHeight(140);
                });
                imageChunks = chunk(images, concurrentNumber);
                chunkedImageResults = [];
                _i = 0, imageChunks_1 = imageChunks;
                _c.label = 1;
            case 1:
                if (!(_i < imageChunks_1.length)) return [3 /*break*/, 4];
                imageChunk = imageChunks_1[_i];
                _b = (_a = chunkedImageResults).push;
                return [4 /*yield*/, performBatchAsyncGetImages(imageChunk.map(function (_a) {
                        var absoluteURL = _a.absoluteURL;
                        return absoluteURL;
                    }), auth)];
            case 2:
                _b.apply(_a, [_c.sent()]);
                _c.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                imageResults = chunkedImageResults.reduce(function (accumulator, value) { return accumulator.concat(value); }, []);
                return [4 /*yield*/, Promise.all(images.map(function (imageData, index) { return __awaiter(void 0, void 0, void 0, function () {
                        var isSVG, pngBuffer;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    isSVG = Boolean(imageData.src.match(IMAGE_TYPE_SVG_REGEX));
                                    if (!isSVG) return [3 /*break*/, 2];
                                    return [4 /*yield*/, sharp(imageResults[index], { density: SVG_TO_PNG_DENSITY_DEFAULT }).png().toBuffer()];
                                case 1:
                                    pngBuffer = _a.sent();
                                    return [2 /*return*/, pngBuffer];
                                case 2: return [2 /*return*/, imageResults[index]];
                            }
                        });
                    }); }))];
            case 5:
                pngImageResults = _c.sent();
                pngImageResults.forEach(function (image, index) {
                    workSheet.addImage({
                        image: image,
                        type: 'picture',
                        position: {
                            type: 'twoCellAnchor',
                            from: {
                                col: 2,
                                row: index + 2,
                                colOff: 0,
                                rowOff: 0
                            },
                            to: {
                                col: 3,
                                row: index + 3,
                                colOff: 0,
                                rowOff: 0
                            }
                        }
                    });
                });
                return [2 /*return*/, workBook];
        }
    });
}); };
var writeToDisk = function (report, concurrentNumber, auth, json, xlsx, filename) { return __awaiter(void 0, void 0, void 0, function () {
    var jsonFilenames, xlsxFilenames;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                log.writingToDisk(report, json, xlsx);
                jsonFilenames = [];
                xlsxFilenames = [];
                return [4 /*yield*/, Promise.all(report.map(function (reportItem) { return __awaiter(void 0, void 0, void 0, function () {
                        var jsonFilename, workBook, xlsxFilename, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (json) {
                                        try {
                                            jsonFilename = filename ? filename + ".json" : generateReportFilename(reportItem.url, 'json');
                                            filesystem.writeFile(jsonFilename, JSON.stringify(reportItem), 'utf8', function (error) { return error ? log.errorWritingToDisk(error, true) : undefined; });
                                            jsonFilenames.push(jsonFilename);
                                        }
                                        catch (error) {
                                            log.errorWritingToDisk(error, true);
                                        }
                                    }
                                    if (!xlsx) return [3 /*break*/, 4];
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, createExcelWorkbook(reportItem, concurrentNumber, auth)];
                                case 2:
                                    workBook = _a.sent();
                                    xlsxFilename = filename ? filename + ".xlsx" : generateReportFilename(reportItem.url, 'xlsx');
                                    workBook.write(xlsxFilename);
                                    xlsxFilenames.push(xlsxFilename);
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_1 = _a.sent();
                                    log.errorWritingToDisk(error_1, false, true);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 1:
                _a.sent();
                log.wroteToDisk(jsonFilenames, xlsxFilenames, json, xlsx);
                return [2 /*return*/];
        }
    });
}); };
var init = function () { return __awaiter(void 0, void 0, void 0, function () {
    var inputURLs, prefix, protocol, auth, concurrent, json, xlsx, filename, _a, username, password, validURLs, requests, concurrentNumber, imageRequests, imageRequestChunks, chunkedResults, _i, imageRequestChunks_1, imageRequestChunk, _b, _c, results, reportData, report;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                inputURLs = program.sites, prefix = program.prefix, protocol = program.protocol, auth = program.auth, concurrent = program.concurrent, json = program.json, xlsx = program.xlsx, filename = program.filename;
                _a = auth ? auth.split(':') : [], username = _a[0], password = _a[1];
                if (inputURLs.length === 0) {
                    log.missingInputURLs();
                    process.exit(1);
                }
                if (auth && (!username || !password)) {
                    log.failedToParseAuth();
                    process.exit(1);
                }
                if (!json && !xlsx) {
                    log.noReportsBeingCreated();
                }
                validURLs = validateURLs(inputURLs);
                requests = generateRequests(validURLs, protocol, prefix);
                redirectReport.push.apply(redirectReport, requests.map(function (request) { return (__assign(__assign({}, request), { responses: [] })); }));
                concurrentNumber = concurrent ? parseInt(concurrent) : CONCURRENT_REQUESTS_DEFAULT;
                return [4 /*yield*/, recursivelyCheckRedirectsAndUpdateReport(requests, concurrentNumber, auth)];
            case 1:
                _d.sent();
                imageRequests = [];
                redirectReport.forEach(function (_a) {
                    var responses = _a.responses, rest = __rest(_a, ["responses"]);
                    var lastResponse = responses[responses.length - 1];
                    if (lastResponse.statusCode && lastResponse.statusCode === 200) {
                        imageRequests.push(__assign(__assign({}, rest), { url: lastResponse.url }));
                    }
                });
                if (imageRequests.length !== requests.length) {
                    log.someRequestsPruned();
                }
                imageRequestChunks = chunk(imageRequests, concurrentNumber);
                chunkedResults = [];
                _i = 0, imageRequestChunks_1 = imageRequestChunks;
                _d.label = 2;
            case 2:
                if (!(_i < imageRequestChunks_1.length)) return [3 /*break*/, 5];
                imageRequestChunk = imageRequestChunks_1[_i];
                _c = (_b = chunkedResults).push;
                return [4 /*yield*/, performBatchAsyncDataRequests(imageRequestChunk, auth)];
            case 3:
                _c.apply(_b, [_d.sent()]);
                _d.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5:
                results = chunkedResults.reduce(function (accumulator, value) { return accumulator.concat(value); }, []);
                reportData = results.map(function (_a) {
                    var data = _a.data, rest = __rest(_a, ["data"]);
                    return (__assign(__assign({}, rest), { images: data.match(IMAGE_ELEMENT_REGEX) || [] }));
                });
                report = evaluateImages(reportData);
                return [4 /*yield*/, writeToDisk(report, concurrentNumber, auth, json, xlsx, filename)];
            case 6:
                _d.sent();
                if (didError) {
                    log.programDidError();
                }
                return [2 /*return*/];
        }
    });
}); };
init();
