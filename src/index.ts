#!/usr/bin/env node

const program = require('commander');
const sharp = require('sharp');
import { randomFillSync } from 'crypto';
import { green, red, yellow, cyan, magenta, white } from 'chalk';
import * as http from 'http';
import * as https from 'https';
import * as filesystem from 'fs';

type InputURLData = {inputIndex: number, inputURL: string}
type RequestData = InputURLData & {guid: string, url: string}
type ResponseData = RequestData & {statusCode?: number, data?: any, error?: Error}
type RedirectRequestData = {guid: string, url: string}
type RedirectResponseData = RedirectRequestData & {statusCode?: number, location?: string, error?: Error}
type ImageAccessibilityInfo = {
    hasSrc: boolean;
    src: string;
    hasAlt: boolean;
    alt: string;
    hasTitle: boolean;
    title: string;
    hasArias: boolean;
    arias: string[];
    hasRole: boolean;
    role: string;
    hasLongdesc: boolean;
    longdesc: string;
    absoluteURL: string;
}
type ReportData = ResponseData & {images: RegExpMatchArray}
type ReportItem = (ResponseData & {images: ImageAccessibilityInfo[]})

const CONCURRENT_REQUESTS_DEFAULT = 5;
const REPORT_FILENAME_SUFFIX_DEFAULT = 'images';
const USER_AGENT_DEFAULT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36';
const URL_PROTOCOL_REGEX = /^(?:f|ht)tps?\:\/\//;
const URL_HTTPS_PROTOCOL_REGEX = /^https:\/\//;
const URL_VALIDATION_REGEX = /^((?:f|ht)tps?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;
const IMAGE_ELEMENT_REGEX = /<img[\w\W]+?>/g;
const SRC_ATTRIBUTE_CAPTURE_REGEX = /src=([^\s]+)/;
const ALT_ATTRIBUTE_CAPTURE_REGEX = /alt=([^\s]+)/;
const TITLE_ATTRIBUTE_CAPTURE_REGEX = /title=([^\s]+)/;
const ROLE_ATTRIBUTE_CAPTURE_REGEX = /role=([^\s]+)/;
const LONGDESC_ATTRIBUTE_CAPTURE_REGEX = /longdesc=([^\s]+)/;
const ARIA_GLOBAL_ATTRIBUTE_CAPTURE_REGEX = /aria-[a-zA-Z]+=([^\s]+)/g;
const IMAGE_TYPE_SVG_REGEX = /\.svg/;
const SVG_TO_PNG_DENSITY_DEFAULT = 400;

const redirectReport: (RequestData & {
    responses: RedirectResponseData[];
})[] = [];

let didError = false;

program
    .option('-s, --sites <urls>', 'Comma-delimited list of URLs to check images', (string: string) => string.split(','), [])
    .option('-p, --prefix <prefix>', 'Prefix to be applied to all sites without a protocol')
    .option('-r, --protocol <protocol>', 'Protocol to be applied to all sites without a protocol')
    .option('-a, --auth <username:password>', 'Provide a username and password for authentication')
    .option('-n, --concurrent <number>', 'Number of request to make concurrently. Defaults to 5')
    .option('-j, --json', 'Generates JSON reports')
    .option('-x, --xlsx', 'Generates XLSX reports')
    .option('-f, --filename <filename>', 'Set the name of the generated report file')
    .parse(process.argv);

const log = {
    missingInputURLs: () => {
        console.error(red(`\n    ERROR: No site URLs were given.\n    Please make sure to include URLs with -s or --sites: ${magenta('image-accessibility-tester -s google.com,facebook.com')}\n`));
    },
    failedToParseAuth: () => {
        console.error(red(`\n    ERROR: Could not parse auth option (username and password), please check the format:\n    ${magenta('redirect-tester -s example.com -a username:password')}\n`));
    },
    noReportsBeingCreated: () => {
        console.warn(yellow('\n    WARNING: No reports are being created. Use the --json or --xlsx options to generate reports.'));
    },
    prefixWarning: (missingPrefixURLs: {inputIndex: number, inputURL: string}[]) => {
        console.warn(yellow('\n    WARNING: Some input URLs did not have a protocol, and no prefix was provided:\n'));
        missingPrefixURLs.forEach(({ inputURL, inputIndex }) => console.log(yellow(`    ${inputIndex + 1}. ${inputURL}`)));
    },
    invalidError: (invalidURLs: {inputIndex: number, inputURL: string}[]) => {
        didError = true;
        console.error(red('\n    ERROR: Some input URLs were invalid:\n'));
        invalidURLs.forEach(({ inputURL, inputIndex }) => console.log(red(`    ${inputIndex + 1}. ${inputURL}`)));
    },
    requestError: ({ error, url }: {error?: Error, url: string}, inputIndex: number | undefined) => {
        didError = true;
        console.error(red('\n    ERROR: An error occurred during the URL request:'));
        console.log(red(`    ${inputIndex !== undefined ? `${inputIndex + 1}.` : undefined}`, url));
        console.log(red(`    `, error));
    },
    missingTargetResult: ({ guid, url }: RedirectRequestData) => {
        didError = true;
        console.error(red('\n    ERROR: Missing targetResult when searching by GUID. This should not happen.\n    Please contact a developer and provide the following information:\n'));
        console.log(magenta(`    targetResult guid = ${guid}\n`));
        console.log(magenta(`    targetResult url = ${url}\n`));
    },
    someRequestsPruned: () => {
        console.warn(yellow('\n    WARNING: Some URLs did not result in a status code of 200.\n    Images will not be retrieved from these URLs:\n'));
        redirectReport.forEach(({ responses, inputIndex, inputURL }) => {
            const { error, statusCode } = responses[responses.length - 1];
            if (error || !statusCode || (statusCode && statusCode !== 200)) {
                console.log(yellow(`\n    ${inputIndex}. ${inputURL}`));
                console.log(yellow(`    Status Code: ${statusCode}, Error: ${error}`));
            }
        });
    },
    writingToDisk: (report: ReportItem[], json?: boolean, xlsx?: boolean) => {
        console.log(white(`\n\n    Generating report types:\n    ---------------------------------------------------\n    ${json ? green('✓') : red('x')} JSON    ${xlsx ? green('✓') : red('x')} XLSX\n\n\n    Processing ${cyan(report.length)} URLs: \n    ---------------------------------------------------`));
        report.forEach(({ url }, index) => console.log(`    ${cyan(`${index + 1}.`)} ${white(url)}`));
        console.log('\n');
    },
    errorWritingToDisk: (error: Error, json?: boolean, xlsx?: boolean) => {
        didError = true;
        console.error(red(`\n    ERROR: Error writing ${json ? 'JSON' : xlsx ? 'XLSX' : ''} report to disk:`, error));
    },
    wroteToDisk: (jsonFilenames: string[], xlsxFilenames: string[], json?: boolean, xlsx?: boolean) => {
        if (json) {
            console.log(white(`\n    Wrote JSON report(s) to disk:\n`));
            jsonFilenames.forEach((filename, index) => console.log(white(`        ${index + 1}. ${cyan(filename)}`)));
            console.log('\n');
        }
        if (xlsx) {
            if (!json) {
                console.log('\n');
            }
            console.log(white(`    Wrote XLSX report(s) to disk:\n`));
            xlsxFilenames.forEach((filename, index) => console.log(white(`        ${index + 1}. ${cyan(filename)}`)));
            console.log('\n');
        }
    },
    programDidError: () => {
        console.error(red('\n    ERROR: At least one error occurred while the tool was running.\n    However, the report was able to be completed.\n    Please review the console for any error messages.\n'));
    },
};

const validateURLs = (inputURLs: string[]): InputURLData[] => {
    let validURLs: InputURLData[] = [];
    let invalidURLs: InputURLData[] = [];

    inputURLs.forEach((inputURL, index) => {
        const urlObject = { inputIndex: index, inputURL };
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

const generateRequests = (validURLs: InputURLData[], protocol?: string, prefix?: string): RequestData[] => {
    let missingPrefixURLs: InputURLData[] = [];

    const requests = validURLs.map(({ inputURL, inputIndex }) => {
        let url: string;

        if (URL_PROTOCOL_REGEX.test(inputURL)) {
            url = new URL(inputURL).href;
        }
        else {
            missingPrefixURLs.push({ inputURL, inputIndex });
            url = new URL((protocol ? protocol : 'https://') + (prefix ? prefix : '') + inputURL).href;
        }

        return {
            guid: generateGuid(),
            url,
            inputURL,
            inputIndex,
        };
    });

    if (missingPrefixURLs.length > 0 && !prefix) {
        log.prefixWarning(missingPrefixURLs);
    }

    return requests;
};

const generateGuid = (): string => {
    const placeholder = (([ 1e7 ] as any) + -1e3 + -4e3 + -8e3 + -1e11);
    const guid = placeholder.replace(/[018]/g, (character: number) => {
        const randomNumber = (randomFillSync(new Uint8Array(1))[0] & 15) >> (character / 4);
        const randomString = (character ^ randomNumber).toString(16);

        return randomString;
    });

    return guid;
};

const chunk = <T>(items: T[], batchSize: number) => {
    const length = items.length;
    const chunks: T[][] = [];

    for (let i = 0; i < length; i += batchSize) {
        chunks.push(items.slice(i, i + batchSize));
    }

    return chunks;
};

const performBatchAsyncDataRequests = (requests: RequestData[], auth?: string) => {
    return Promise.all<ResponseData>(requests.map(({ url, ...rest }) => {
        return new Promise(resolve => {
            try {
                const protocolAdapter = URL_HTTPS_PROTOCOL_REGEX.test(url) ? https : http;
                protocolAdapter.get(
                    url,
                    { headers: { 'User-Agent': USER_AGENT_DEFAULT } },
                    response => {
                        const { statusCode } = response;

                        if (statusCode === 401 && auth) {
                            protocolAdapter.get(
                                url,
                                {
                                    headers: {
                                        'User-Agent': USER_AGENT_DEFAULT,
                                        'Authorization': 'Basic ' + Buffer.from(auth).toString('base64'),
                                    }
                                },
                                response => {
                                    const { statusCode } = response;
                                    const chunks: any = [];
                                    response.on('data', chunk => chunks.push(chunk));
                                    response.on('end', () => resolve({ ...rest, url, statusCode, data: chunks.join('') }));
                                }
                            ).on('error', error => resolve({ ...rest, url, error }));
                        }
                        else {
                            const chunks: any = [];
                            response.on('data', chunk => chunks.push(chunk));
                            response.on('end', () => resolve({ ...rest, url, statusCode, data: chunks.join('') }));
                        }
                    }
                ).on('error', error => resolve({ ...rest, url, error }));
            }
            catch (error) {
                resolve({ ...rest, url, error });
            }
        });
    }));
};

const performBatchAsyncRequests = (requests: RedirectRequestData[], auth?: string) => {
    return Promise.all<RedirectResponseData>(requests.map(({ url, ...rest }) => {
        return new Promise(resolve => {
            try {
                const protocolAdapter = URL_HTTPS_PROTOCOL_REGEX.test(url) ? https : http;
                protocolAdapter.get(
                    url,
                    { headers: { 'User-Agent': USER_AGENT_DEFAULT } },
                    ({ statusCode, headers }) => {
                        if (statusCode === 401 && auth) {
                            protocolAdapter.get(
                                url,
                                {
                                    headers: {
                                        'User-Agent': USER_AGENT_DEFAULT,
                                        'Authorization': 'Basic ' + Buffer.from(auth).toString('base64'),
                                    }
                                },
                                ({ statusCode, headers }) => resolve({ ...rest, url, statusCode, location: headers && headers.location })
                            ).on('error', error => resolve({ ...rest, url, error }));
                        }
                        else {
                            resolve({ ...rest, url, statusCode, location: headers && headers.location });
                        }
                    }
                ).on('error', error => resolve({ ...rest, url, error }));
            }
            catch (error) {
                resolve({ ...rest, url, error });
            }
        });
    }));
};

const batchCheckRedirects = async (requests: RedirectRequestData[], numberOfConcurrentRequests: number, auth?: string) => {
    const requestChunks = chunk<RedirectRequestData>(requests, numberOfConcurrentRequests);
    const chunkedResults: RedirectResponseData[][] = [];

    for (let chunk of requestChunks) {
        chunkedResults.push(await performBatchAsyncRequests(chunk, auth));
    }

    const results = chunkedResults.reduce((accumulator, value) => accumulator.concat(value), []);

    return results;
};

const updateRedirectReport = (results: RedirectResponseData[]) => {
    results.forEach(result => {
        const targetBaseURL = redirectReport.find(({ guid }) => guid === result.guid);

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

const recursivelyCheckRedirectsAndUpdateReport = async (requests: RedirectRequestData[], numberOfConcurrentRequests: number, auth?: string) => {
    const results = await batchCheckRedirects(requests, numberOfConcurrentRequests, auth);
    updateRedirectReport(results);

    const redirects = results.filter(({ statusCode, location }) => statusCode && location && statusCode >= 300 && statusCode < 400);

    if (redirects.length) {
        const nextRequests = redirects.map(({ guid, location }) => ({ guid, url: location as string }));
        await recursivelyCheckRedirectsAndUpdateReport(nextRequests, numberOfConcurrentRequests, auth);
    }
};

const performBatchAsyncGetImages = (imageURLs: string[], auth?: string) => {
    return Promise.all<Buffer | Error>(imageURLs.map(url => {
        return new Promise(resolve => {
            try {
                const protocolAdapter = URL_HTTPS_PROTOCOL_REGEX.test(url) ? https : http;
                protocolAdapter.get(
                    url,
                    { headers: { 'User-Agent': USER_AGENT_DEFAULT } },
                    response => {
                        const { statusCode } = response;

                        if (statusCode === 401 && auth) {
                            protocolAdapter.get(
                                url,
                                {
                                    headers: {
                                        'User-Agent': USER_AGENT_DEFAULT,
                                        'Authorization': 'Basic ' + Buffer.from(auth).toString('base64'),
                                    }
                                },
                                response => {
                                    const chunks: any = [];
                                    response.on('data', chunk => chunks.push(chunk));
                                    response.on('end', () => resolve(Buffer.concat(chunks)));
                                }
                            ).on('error', error => resolve(error));
                        }
                        else {
                            const chunks: any = [];
                            response.on('data', chunk => chunks.push(chunk));
                            response.on('end', () => resolve(Buffer.concat(chunks)));
                        }
                    }
                ).on('error', error => resolve(error));
            }
            catch (error) {
                resolve(error);
            }
        });
    }));
};

const trimQuotations = (string: string): string => {
    const firstChar = string.charAt(0);
    const lastChar = string.charAt(string.length - 1);

    if (firstChar === '\'' || firstChar === '"') {
        string = string.substr(1, string.length - 1);
    }

    if (lastChar === '\'' || lastChar === '"') {
        string = string.substr(0, string.length - 1);
    }

    return string;
};

const checkIfMatched = (regexpMatch: RegExpMatchArray | null) => regexpMatch && regexpMatch.length >= 1 ? true : false;

const getFirstMatchingGroup = (regexpMatch: RegExpMatchArray | null) => regexpMatch && regexpMatch.length >= 2 ? regexpMatch[1] : null;

const getTrimmedMatchingGroupValue = (didMatch: boolean, matchingGroup: string | null) => didMatch && matchingGroup ? trimQuotations(matchingGroup) : '';

const evaluateImages = (reportData: ReportData[]): ReportItem[] => {
    return reportData.map(({ url, images, ...rest }) => {
        const domain = new URL(url).origin;
        const processedImages = images.map(imageString => {
            const srcMatch = imageString.match(SRC_ATTRIBUTE_CAPTURE_REGEX);
            const hasSrc = checkIfMatched(srcMatch);
            const srcMatchingGroup = getFirstMatchingGroup(srcMatch);
            const src = getTrimmedMatchingGroupValue(hasSrc, srcMatchingGroup);

            const altMatch = imageString.match(ALT_ATTRIBUTE_CAPTURE_REGEX);
            const hasAlt = checkIfMatched(altMatch);
            const altMatchingGroup = getFirstMatchingGroup(altMatch);
            const alt = getTrimmedMatchingGroupValue(hasAlt, altMatchingGroup);

            const titleMatch = imageString.match(TITLE_ATTRIBUTE_CAPTURE_REGEX);
            const hasTitle = checkIfMatched(titleMatch);
            const titleMatchingGroup = getFirstMatchingGroup(titleMatch);
            const title = getTrimmedMatchingGroupValue(hasTitle, titleMatchingGroup);

            const roleMatch = imageString.match(ROLE_ATTRIBUTE_CAPTURE_REGEX);
            const hasRole = checkIfMatched(roleMatch);
            const roleMatchingGroup = getFirstMatchingGroup(roleMatch);
            const role = getTrimmedMatchingGroupValue(hasRole, roleMatchingGroup);

            const longdescMatch = imageString.match(LONGDESC_ATTRIBUTE_CAPTURE_REGEX);
            const hasLongdesc = checkIfMatched(longdescMatch);
            const longdescMatchingGroup = getFirstMatchingGroup(longdescMatch);
            const longdesc = getTrimmedMatchingGroupValue(hasLongdesc, longdescMatchingGroup);

            const ariaMatches = imageString.match(ARIA_GLOBAL_ATTRIBUTE_CAPTURE_REGEX);
            const hasArias = checkIfMatched(ariaMatches);
            const arias: string[] = [];

            if (ariaMatches) {
                ariaMatches.forEach(match => arias.push(match));
            }

            const absoluteURL: string = src.includes(domain) ? src : domain + src;

            return {
                hasSrc,
                src,
                hasAlt,
                alt,
                hasTitle,
                title,
                hasArias,
                arias,
                hasRole,
                role,
                hasLongdesc,
                longdesc,
                absoluteURL,
            };
        });

        return {
            ...rest,
            url,
            images: processedImages,
        };
    });
};

const generateReportFilename = (url: string, fileExtension: string) => {
    const urlName = url.replace(/^https?:\/\//, '').replace(/[\/\?#:\*\$@\!\.]/g, '_');
    const today = new Date();
    const timestamp = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
    return `${timestamp}_${urlName}${urlName.charAt(urlName.length - 1) === '_' ? '' : '_'}${REPORT_FILENAME_SUFFIX_DEFAULT}.${fileExtension}`;
};

const createExcelWorkbook = async (reportItem: ReportItem, concurrentNumber: number, auth?: string) => {
    const { url, inputIndex, inputURL, images } = reportItem;
    const xl = require('excel4node');
    const workBook = new xl.Workbook();
    const workSheet = workBook.addWorksheet('Sheet 1');
    const headerStyle = workBook.createStyle({ fill: { type: 'pattern', patternType: 'solid', fgColor: '#5595D0' }, font: { color: '#FAFAFA', size: 16, bold: true } });
    const asideStyle = workBook.createStyle({ font: { color: '#030308', size: 16, bold: true } });
    const valueStyle = workBook.createStyle({ font: { color: '#030308', size: 12 } });
    const textWrapStyle = workBook.createStyle({ alignment: { wrapText: true } });
    const greyBackgroundStyle = workBook.createStyle({ fill: { type: 'pattern', patternType: 'solid', fgColor: '#CFCFCF' } });

    const headers = [
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

    headers.forEach(([string, width], index) => {
        workSheet.cell(1, index + 1).string(string).style(headerStyle);
        workSheet.column(index + 1).setWidth(width);
    });

    const headersLength = headers.length;

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

    images.forEach(({ src, hasAlt, alt, hasTitle, title, hasArias, arias, hasRole, role, hasLongdesc, longdesc, absoluteURL }, imageIndex) => {
        const rowNumber = imageIndex + 2;
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

    const imageChunks = chunk<ImageAccessibilityInfo>(images, concurrentNumber);
    const chunkedImageResults: (Buffer | Error)[][] = [];

    for (let imageChunk of imageChunks) {
        chunkedImageResults.push(await performBatchAsyncGetImages(imageChunk.map(({absoluteURL}) => absoluteURL), auth));
    }

    const imageResults = chunkedImageResults.reduce((accumulator, value) => accumulator.concat(value), []);

    const pngImageResults = await Promise.all(images.map(async (imageData, index) => {
        const isSVG = Boolean(imageData.src.match(IMAGE_TYPE_SVG_REGEX));

        if (isSVG) {
            const pngBuffer = await sharp(imageResults[index], { density: SVG_TO_PNG_DENSITY_DEFAULT }).png().toBuffer();
            return pngBuffer;
        }
        else {
            return imageResults[index];
        }
    }));

    pngImageResults.forEach((image, index) => {
        workSheet.addImage({
            image,
            type: 'picture',
            position: {
                type: 'twoCellAnchor',
                from: {
                    col: 2,
                    row: index + 2,
                    colOff: 0,
                    rowOff: 0,
                },
                to: {
                    col: 3,
                    row: index + 3,
                    colOff: 0,
                    rowOff: 0,
                },
            },
        });
    });

    return workBook;
};

const writeToDisk = async (report: ReportItem[], concurrentNumber: number, auth?: string, json?: boolean, xlsx?: boolean, filename?: string) => {
    log.writingToDisk(report, json, xlsx);

    const jsonFilenames: string[] = [];
    const xlsxFilenames: string[] = [];

    await Promise.all(report.map(async reportItem => {
        if (json) {
            try {
                const jsonFilename = filename ? `${filename}.json` : generateReportFilename(reportItem.url, 'json');
                filesystem.writeFile(jsonFilename, JSON.stringify(reportItem), 'utf8', error => error ? log.errorWritingToDisk(error, true) : undefined);
                jsonFilenames.push(jsonFilename);
            }
            catch (error) {
                log.errorWritingToDisk(error, true);
            }
        }
        if (xlsx) {
            try {
                const workBook = await createExcelWorkbook(reportItem, concurrentNumber, auth);
                const xlsxFilename = filename ? `${filename}.xlsx` : generateReportFilename(reportItem.url, 'xlsx');
                workBook.write(xlsxFilename);
                xlsxFilenames.push(xlsxFilename);
            }
            catch (error) {
                log.errorWritingToDisk(error, false, true);
            }
        }
    }));

    log.wroteToDisk(jsonFilenames, xlsxFilenames, json, xlsx);
};

const init = async () => {
    const { sites: inputURLs, prefix, protocol, auth, concurrent, json, xlsx, filename } = program;
    const [ username, password ] = auth ? auth.split(':') : [];

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

    const validURLs = validateURLs(inputURLs);
    const requests = generateRequests(validURLs, protocol, prefix);
    redirectReport.push(...requests.map(request => ({ ...request, responses: [] })));
    const concurrentNumber = concurrent ? parseInt(concurrent) : CONCURRENT_REQUESTS_DEFAULT;
    await recursivelyCheckRedirectsAndUpdateReport(requests, concurrentNumber, auth);
    const imageRequests: RequestData[] = [];

    redirectReport.forEach(({ responses, ...rest }) => {
        const lastResponse = responses[responses.length - 1];

        if (lastResponse.statusCode && lastResponse.statusCode === 200) {
            imageRequests.push({ ...rest, url: lastResponse.url });
        }
    });

    if (imageRequests.length !== requests.length) {
        log.someRequestsPruned();
    }

    const imageRequestChunks = chunk<RequestData>(imageRequests, concurrentNumber);
    const chunkedResults: ResponseData[][] = [];

    for (let imageRequestChunk of imageRequestChunks) {
        chunkedResults.push(await performBatchAsyncDataRequests(imageRequestChunk, auth));
    }

    const results = chunkedResults.reduce((accumulator, value) => accumulator.concat(value), []);
    const reportData: ReportData[] = results.map(({ data, ...rest }) => ({ ...rest, images: data.match(IMAGE_ELEMENT_REGEX) || [] }));
    const report = evaluateImages(reportData);
    await writeToDisk(report, concurrentNumber, auth, json, xlsx, filename);

    if (didError) {
        log.programDidError();
    }
};

init();