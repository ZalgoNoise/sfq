
// reportsList is your personal salesforce reports list
const reportsList = [
  "https://{domain}.my.salesforce.com/{report}", 
  "https://{domain}.my.salesforce.com/{report}" 
]

// if cookie expires, results in an error:
//     	TypeError: Cannot read property 'length' of null
//     	  SalesforceExtractTableRows	@ salesforce.gs:189
//     	  SalesforceGetReports	@ salesforce.gs:104
//     	  test	@ salesforce.gs:56
//
// when that happens, open any Salesforce page with
// DevTools in the Network tab, and right-click the HTTP 
// GET request for the Salesforce page, Copy > Copy as cURL.
// Then, from that command, extract the Cookie header value
// and paste as the value for cookieString, below
var cookieString = ""


// cutString is a placeholder for the strings used to
// find and retrieve the table from the salesforce report
// HTML page
const cutString = [
  "<!-- Start report output -->",
  '<td class="nowrapCell" align="right">&nbsp;</td>'
]

// tableItemRegex will contain different regular expressions
// to retrieve the content from each table item.
// Although it is not considered a best-practice, it's the 
// best solution I could find to parse HTML in Apps Script
// where I was actually retrieving the results I was looking for
const tableItemRegex = [
  '<td >(.*?)</td>',
  '<a href="(.*?)">(.*?)</a>',
  '<img src=".*" alt="(.*)" width="16" height="16" class="checkImg" title=.* />'
]


// tableTypeEnum will contain the different types of 
// items in a salesforce report table
const tableTypeEnum = [
  'checkbox',
  'url',
  'data',
  'urlData'
]


// test function examplifies the usage of this library
// where you are able to retrieve encapsulated lists of your reports contents
// this should be perceived as a list of maps, where the array encapsulation
// follows the logic below:
//   - reports (a list)
//      - entries (a list)
//        - columns / content objects (objects with a type and content key)
//          - if type is urlData, then content will be a list of content objects for url, and data
//
function test() {
  reports = SalesforceGetReports(cookieString, reportsList)
  
  // get all entries in the first report
  Logger.log(reports[0])
  
  // get all content from the first entry in the first report
  Logger.log(reports[0][0])
  
  // get the first column / content object from the first entry in the first report
  Logger.log(reports[0][0][0])
  
  // if this object is of type data or urlData, get it's value
  Logger.log(reports[0][0][0].content)
  
  // in case it's urlData, you can either
  //   - get the URL
  Logger.log(reports[0][0][0].content[0].content)
  
  //   - or the displayed value
  Logger.log(reports[0][0][0].content[1].content)
  
  // notice that all items will follow the same 
  // structure as a matrix or a map
  Logger.log(reports[0][1][0].content[0])
  Logger.log(reports[0][2][0].content[0])
  Logger.log(reports[0][3][0].content[0])
  Logger.log(reports[0][4][0].content[0])
  
  
}


// SalesforceGetReport function will take in a 
// cookie and report URL to return a map of its contents
function SalesforceGetReport(cookie, report) {

  return SalesforceExtractTableRows(SalesforceGetTableFromPage(SalesforceFetchPage(cookie, report)))
  
}

// SalesforceGetReports function will take in a 
// cookie and a list of report URLs to return a 
// list of maps, with its contents
function SalesforceGetReports(cookie, reportsList) {

  var results = [];
  
  for (var i = 0; i < reportsList.length; i++) {
    results.push(SalesforceExtractTableRows(SalesforceGetTableFromPage(SalesforceFetchPage(cookie, reportsList[i]))))
  }
  
  if (results.length > 0) {
    return results
  } 
  
  return null
}

// SalesforceFetchPage function will issue a HTTP request 
// against your salesforce report URL, passing in the 
// cookie value you've retrieved from your active session
function SalesforceFetchPage(cookie, url) {

  // build request parameters in an object
  var options = {
    "async": true,
    "crossDomain": true,
    "followRedirects": true,
    "method" : "GET",
    "headers" : {
      "Cookie": cookie
      }
    };
    
  // fetch the page with the options object,
  // retrieving the plaintext content of the webpage
  page = UrlFetchApp.fetch(url, options).getContentText()
  
  // return HTML content
  return page
}

// SalesforceGetTableFromPage function will take in a 
// salesforce report HTML page and retrive a reports 
// table from it, by slicing the contents using two key strings.
//
// This is also a breakpoint for when the cookie is invalid, as the 
// function will return null if it does not meet all requirements
// (must slice the page before and after the table successfully)
function SalesforceGetTableFromPage(page) {

  table = [];

  // split page using first reference string (table header)
  splitTableBegin = page.split(cutString[0])

  // if there is no "second half", return null
  if (!splitTableBegin[1]) {
    return null
  }

  // split page using second reference string (table footer)
  splitTableEnd = splitTableBegin[1].split(cutString[1])

  // if there is no "first half", return null
  if (!splitTableEnd[0]) {
    return null
  }

  // build list of paragraphs by splitting content by newline ('\n')
  tableItems = splitTableEnd[0].split('\n')

  // build a table object only holding the table entries, 
  // by skipping the first and last two lines 
  // (it's less messy and more accurate if cut and parsed like this)
  for (var i = 2 ; i < (tableItems.length - 2); i++ ) {
    table.push(tableItems[i])
  }

  // return a table, which is a list of rows
  return table
}


// SalesforceExtractTableRows function will take in a table 
// and iterate through its contents, building objects for each
// column it comes across - depending on the pattern matching -
// returning parsed rows 
function SalesforceExtractTableRows(table) {

  var rows = [];

  // iterate through the table's rows
  for (var i = 0; i < table.length; i++) {
  
    // build a list of objects (for the columns in the array) 
    // for each entry it finds
    var content = SalesforceExtractRowContents(table[i], tableItemRegex[0])
    
    // if the object list is not empty, add it to the list
    if (content) {
      rows.push(content)
    }
    
  }

  // if parsed list is not empty, return it
  if (rows.length > 0) {
    return rows
  }
  return null
}


// SalesforceExtractRowContents function will take in a 
// row and parse its contents (each column) while building
// objects representing its content.
// 
// It then returns list of objects, which represent a row
// (an entry) with all its labeled contents
function SalesforceExtractRowContents(input, regex) {

  results = [];
  
  // Regex match the provided input and regex string,
  // with global+case.insensitive parameters
  //
  // This ensures that all matches in this row are captured
  // and can be individually processed using the same regex
  if (input.match(RegExp(regex, "gi"))) {
  
    match = input.match(RegExp(regex, "gi"))
   
    // iterate through all matches for this regex string
    // (each column in the table)
    for (var i = 0; i < match.length; i++) {
      
      // build an object based on this column's content,
      // or, the tableTypeEnum found
      var obj = SalesforceCreateTableObjects(match[i])
      
      // if not empty, add this object to the results list
      if (obj) {
        results.push(obj)
      }
    }
    
  }
  
  // if results is not empty, return it
  if (results.length > 0) {
    return results
  }
  return null
}


// SalesforceCreateTableObjects function will breakdown each
// salesforce column, for each row, and classify it as one of the
// available tableTypeEnum:
//   - checkbox
//   - url
//   - data
//   - urlData
//
// When parsing, the type field can be useful to tell apart what content
// you wish to keep - however the content field will hold the actual value
//
// Exceptionally, fields which hold a URL besides the value (because of href)
// are built as an urlData object, which will have two nested objects like this
// listed in its contents, [0] for url, [1] for data.
function SalesforceCreateTableObjects(input) {
  
    var obj = {};
    
    // check if input matches the second tableItemRegex
    // which captures urlData objects
    // 
    // these are nested in the following pattern:
    //   {
    //     "type": "urlData",
    //     "content": [
    //       {
    //         "type": "url",
    //         "content": "{theUrl}"
    //       },
    //       {
    //         "type": "data",
    //         "content": "{theData}"   
    //       }
    //     ]
    //   }
    //
    if (input.match(RegExp(tableItemRegex[1], "i"))) {
    
      mt = input.match(RegExp(tableItemRegex[1], "i"))
      
      obj = {
        type: tableTypeEnum[3],
        content: [
          {
            type: tableTypeEnum[1],
            content: mt[1]
          },
          {
            type: tableTypeEnum[2],
            content: mt[2]
          }
        ]
      }
      
      // break by immediately returning the object
      return obj
      
    // check if input matches the third tableItemRegex
    // which captures checkbox items
    // 
    // these are defining content with a boolean such as:
    //   {
    //     "type": "checkbox",
    //     "content": true
    //   }
    //
    //   {
    //     "type": "checkbox",
    //     "content": false
    //   }
    //
    } else if (input.match(RegExp(tableItemRegex[2], "i"))) {
    
      mt = input.match(RegExp(tableItemRegex[2], "i"))
      
      if (mt[1] == "Not Checked") {
        var status = false
      } else {
        var status = true
      }

      obj = {
        type: tableTypeEnum[0],
        content: status
      }
      
      // break by immediately returning the object
      return obj
      
    // finally see if input matches the first tableItemRegex
    // which captures plaintext (data) items
    // 
    // these are defining content with a string such as:
    //   {
    //     "type": "data",
    //     "content": "{theData}
    //   }
    //
    } else if (input.match(RegExp(tableItemRegex[0], "i"))) {
    
      mt = input.match(RegExp(tableItemRegex[0], "i"))
      
      obj = {
        type: tableTypeEnum[2],
        content: mt[1]
      }
      
      // break by immediately returning the object
      return obj

    }
    
    // if none of the checks pass, return null
    return null
  
}
