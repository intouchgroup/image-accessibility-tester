## @intouchgroup/image-accessibility-tester

Image Accessibility Tester is a tool to automatically scrape images and image accessibility data from websites, and write the findings to an Excel workbook or JSON report.

The tool makes multiple requests simultaneously, can handle HTTP or HTTPS domains, allows passing a prefix for a list of domains, and is capable of scraping sites which require Authentication.


### Installation

You must have [NodeJS](https://nodejs.org/en/) version 12+ installed to use this module.

To check what version of NodeJS you have, launch Terminal on Mac or Powershell on Windows and type `node -v`.

Once you have NodeJS 12+, globally install the latest version of this module from Terminal or Powershell:

`npm i -g @intouchgroup/image-accessibility-tester`

You can now run the Image Accessibility Tester from any folder on your computer using Terminal or Powershell.


### Usage

When you open Terminal or Powershell, you will see a file path listed in the prompt. This is the current location of your Terminal or Powershell.

You can change locations using the `cd FILE_PATH` command. `cd` stands for "change directory" (go to a different folder), and is how you navigate using Terminal or Powershell.

1. Using Terminal or Powershell, navigate to the folder where you want to save the Image Accessibility Tester reports. For example: `cd Desktop/Reports`

2. Now run the Image Accessibility Tester tool from Terminal or Powershell with whatever *arguments* you want. For example: `image-accessibility-tester -s intouchsol.com`


### Arguments

Arguments are how we tell `image-accessibility-tester` what to do. Some arguments are required, while others are completely optional. Arguments can be passed in any order, but the value must come right after the argument text. For example:

`image-accessibility-tester --argument "This is the value of the argument"`

A full list of available arguments with examples is presented below.

| Short name   | Long name          | What it does                                              |
|--------------|--------------------|-----------------------------------------------------------|
|  `-h`        |  `--help`          |  Shows all available arguments                            |
|  `-s`        |  `--sites`         |  Comma-separated list of URLs to scrape                   |
|  `-p`        |  `--prefix`        |  Prefix text for all site URLs without a protocol         |
|  `-r`        |  `--protocol`      |  Protocol text for all site URLs without a protocol       |
|  `-a`        |  `--auth`          |  Username and password for site URLs that require auth    |
|  `-n`        |  `--concurrent`    |  Number of requests to make simultaneously (default: 5)   |
|  `-j`        |  `-json`           |  Generate JSON report                                     |
|  `-x`        |  `--xlsx`          |  Generate XLSX report                                     |
|  `-f`        |  `--filename`      |  Manually set the name of the generated report            |


### Examples

<br>1. Generate an Excel report for multiple sites:

`image-accessibility-tester -s intouchsol.com,google.com -x`

> Tests ht&#8203;tps://intouchsol.com and ht&#8203;tps://google.com

<br><br>2. Generate a JSON report for multiple staging sites:

`image-accessibility-tester -s intouchsol.com,google.com -p "staging." -j`

> Tests ht&#8203;tps://staging.intouchsol.com and ht&#8203;tps://staging.google.com

<br><br>3. Generate an Excel report for multiple staging sites with different protocols:

`image-accessibility-tester -s intouchsol.com,https://google.com -p "staging." -r "http://" -x`

> Tests ht&#8203;tp://staging.intouchsol.com and ht&#8203;tps://google.com

<br><br>4. Generate an Excel report named "MyBestReportYet":

`image-accessibility-tester -s intouchsol.com -x -f "MyBestReportYet"`

> Tests ht&#8203;tps://intouchsol.com

<br><br>5. Authentication login info must be in the format `username:password`:

`image-accessibility-tester -s private.intouchsol.com -x -a "joe.smith:Password123!"`

> Tests https://private.intouchsol.com with authentication

<br><br>6. Use long or short names for arguments. These commands are exactly equivalent:

`image-accessibility-tester -s intouchsol.com -x -r "http://" -f "MyBestReportYet"`

`image-accessibility-tester --sites intouchsol.com --excel --protocol "http://" --filename "MyBestReportYet"`