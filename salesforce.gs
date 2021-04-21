/**
 * reportsList is your personal salesforce reports list
 *
 * const reportsList = [
 *   "https://{domain}.my.salesforce.com/{report}", 
 *   "https://{domain}.my.salesforce.com/{report}" 
 * ]
 */


/**
 * if cookie expires, results in an error:
 *      	TypeError: Cannot read property 'length' of null
 *      	  SalesforceExtractTableRows	@ salesforce.gs:189
 *      	  SalesforceGetReports	@ salesforce.gs:104
 *      	  test	@ salesforce.gs:56
 * 
 * when that happens, open any Salesforce page with
 * DevTools in the Network tab, and right-click the HTTP 
 * GET request for the Salesforce page, Copy > Copy as cURL.
 * Then, from that command, extract the Cookie header value
 * and paste as the value for cookieString, below
 * 
 * var cookieString = ""
 */

/**
 * test function examplifies the usage of this library
 * where you are able to retrieve encapsulated lists of your reports contents
 * this should be perceived as a list of maps, where the array encapsulation
 * follows the logic below:
 *   - reports (a list)
 *      - entries (a list)
 *        - columns / content objects (objects with a type and content key)
 *          - if type is urlData, then content will be a list of content objects for url, and data
 *
 *    function test() {
 *      report = new Report(cookie, reportURL)
 *      
 *      // get all entries in the report
 *      Logger.log(report.GetObjects())
 *      
 *      // get all content from the first entry in the report
 *      Logger.log(report.GetEntry(0))
 *      // or
 *      Logger.log(report.GetObjects()[0])
 *      
 *      // get the first column / content object from the first entry in the report
 *      Logger.log(report.GetEntry(0)[0])
 *      // or
 *      Logger.log(report.GetObjects()[0][0])
 *     
 *      // if this object is of type data or urlData, get it's value
 *      Logger.log(report.GetEntry(0)[0].content)
 *      
 *      // in case it's urlData, you can either
 *      //   - get the URL
 *      Logger.log(report.GetEntry(0)[0].content[0].content)
 *      
 *      //   - or the displayed value
 *      Logger.log(report.GetEntry(0)[0].content[1].content)
 *      
 *      // notice that all items will follow the same 
 *      // structure as a matrix or a map
 *      Logger.log(report.GetEntry(0)[0].content[0])
 *      Logger.log(report.GetEntry(1)[0].content[0])
 *      Logger.log(report.GetEntry(2)[0].content[0])
 *      Logger.log(report.GetEntry(3)[0].content[0])
 *      
 *      
 *    }
 *
/*

/**
 * cutString is a placeholder for the strings used to
 * find and retrieve the table from the salesforce report
 * HTML page
 */
const cutString = [
  "<!-- Start report output -->",
  '<td class="nowrapCell" align="right">&nbsp;</td>'
]

/**
 * tableItemRegex will contain different regular expressions
 * to retrieve the content from each table item.
 * Although it is not considered a best-practice, it's the 
 * best solution I could find to parse HTML in Apps Script
 * where I was actually retrieving the results I was looking for
 */
const tableItemRegex = [
  '<td >(.*?)</td>',
  '<a href="(.*?)">(.*?)</a>',
  '<img src=".*" alt="(.*)" width="16" height="16" class="checkImg" title=.* />'
]


/** 
 * tableTypeEnum will contain the different types of 
 * items in a salesforce report table
 */
const tableTypeEnum = [
  'checkbox',
  'url',
  'data',
  'urlData'
]

class Report {
  constructor(cookie, url){
    this.error = [];
    this.rawHTML = "";
    this.content = [];
    this.objects = [];

    this.Panic = function(error) {
      this.error.push(error)
      console.error(error)
    }

    this.Errors = function() {
      return this.error
    }

    this.SetCookie = function(cookie) {
      if (cookie.match(RegExp("^curl .*"))) {
        var params = cookie.split("'")
        for (var i = 0; i < params.length; i++) {
          if (params[i].match(RegExp('^Cookie: '))) {
            cookie = params[i].split(RegExp('^Cookie: '))
            this.cookie =  cookie[1]
            return
          }
        }
        this.cookie =  null
        this.Panic("Invalid input parameter - Couldn't resolve curl command to retrieve cookie.")
        return
      }
      this.cookie =  cookie
      return
    };

    this.GetCookie = function() {
      return this.cookie
    }

    this.SetURL = function(url) {
      if (url.match(RegExp("^curl .*"))) {
        var params = cookie.split("'")
        Logger.log(params[1])
        if (params[1].match(RegExp('^https://.*'))) {
          this.url =  params[1]
          return
        }
        this.url =  null
        this.Panic("Invalid input parameter - Couldn't resolve curl command to retrieve URL.")
        return
      }
      this.url =  url
      return
    };


    this.GetURL = function() {
      return this.url
    }

    this.SetCookie(cookie)

    if (!url && cookie.match(RegExp("^curl .*"))) {
      this.SetURL(cookie)
    } else {
      this.SetURL(url)
    }
    
    this.Fetch = function() {
      
      function getTable(input) {
        var table = [];
        // split page using first reference string (table header)
        var splitTableBegin = input.split(cutString[0])

        // if there is no "second half", return null
        if (!splitTableBegin[1]) {
          error = "Invalid cookie. Could not retrieve a table from the raw HTML from the Salesforce report"
          return [null, error]
        }

        // split page using second reference string (table footer)
        var splitTableEnd = splitTableBegin[1].split(cutString[1])

        // if there is no "first half", return null
        if (!splitTableEnd[0]) {
          error = "Invalid cookie. Could not retrieve a table from the raw HTML from the Salesforce report"
          return [null, error]
        }

        // build list of paragraphs by splitting content by newline ('\n')
        var tableItems = splitTableEnd[0].split('\n')

        // build a table object only holding the table entries, 
        // by skipping the first and last two lines 
        // (it's less messy and more accurate if cut and parsed like this)
        for (var i = 2 ; i < (tableItems.length - 2); i++ ) {
          table.push(tableItems[i])
        }

        return [table, null]

      }



      function getRows(table) {
        var rows = [];
        // iterate through the table's rows
        for (var i = 0; i < table.length; i++) {
        
          // build a list of objects (for the columns in the array) 
          // for each entry it finds
          var content = getRowContent(table[i], tableItemRegex[0])
          
          // if the object list is not empty, add it to the list
          if (content) {
            rows.push(content)
          }

          
        }
        return rows
      }

      function getRowContent(input, regex) {
        var objects = [];
        
        // Regex match the provided input and regex string,
        // with global+case.insensitive parameters
        //
        // This ensures that all matches in this row are captured
        // and can be individually processed using the same regex
        if (input.match(RegExp(regex, "gi"))) {
        
          var match = input.match(RegExp(regex, "gi"))
        
          // iterate through all matches for this regex string
          // (each column in the table)
          for (var i = 0; i < match.length; i++) {
            
            // build an object based on this column's content,
            // or, the tableTypeEnum found
            var obj = buildObjects(match[i])
            
            // if not empty, add this object to the results list
            if (obj) {
              objects.push(obj)
            }
          }
          
        }
        
        // if objects is not empty, return it
        if (objects.length > 0) {
          return objects
        }
        return null
      }

      function buildObjects(input) {
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
        
          var mt = input.match(RegExp(tableItemRegex[1], "i"))
          
          var obj = {
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
        
          var mt = input.match(RegExp(tableItemRegex[2], "i"))
          
          if (mt[1] == "Not Checked") {
            var status = false
          } else {
            var status = true
          }

          var obj = {
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
        
          var mt = input.match(RegExp(tableItemRegex[0], "i"))
          
          var obj = {
            type: tableTypeEnum[2],
            content: mt[1]
          }
          
          // break by immediately returning the object
          return obj

        }
        
        // if none of the checks pass, return null
        return null
      }

  
      // build request parameters in an object
      var options = {
        "async": true,
        "crossDomain": true,
        "followRedirects": true,
        "method" : "GET",
        "headers" : {
          "Cookie": this.cookie
          }
        };
        
      // fetch the page with the options object,
      // retrieving the plaintext content of the webpage
      this.rawHTML = UrlFetchApp.fetch(this.url, options).getContentText()
      
      var error = null;

      var content = getTable(this.rawHTML)

      if (content[1] != null) {
        this.Panic(content[1])
      } else {
        this.content = content[0]
      }

      this.objects = getRows(this.content)
    }

    this.GetObjects = function() {
      return this.objects
    }

    this.GetGrandTotals = function() {
      return this.objects.length
    }

    this.GetEntry = function(index) {
      return this.objects[index]
    }

  }

}
