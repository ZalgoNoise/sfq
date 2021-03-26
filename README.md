# sfq
Apps Script library for scrapping and querying your Salesforce reports, by issuing a HTTP request with an embeded (valid) cookie


________

### Library 

This library is available in Apps Script by following the steps below:
- In your Apps Script project, click the Plus (`+`) next to Libraries
- Paste the script ID `1JGvNnBHRggJsRDLiwqJ7pSN3yOo2Bw6ytif_JlwCycWXCL_S6LVOT6Z1`
- Click __Look up__
- Click __Add__ once the script is listed with a version and a proposed identifier

_________

### Setup 

In Apps Script, you need to setup variables for your reports and your cookie string:


```javascript
const reportsList = [
  "https://{domain}.my.salesforce.com/{report}", 
  "https://{domain}.my.salesforce.com/{report}" 
]
```

_or_

```javascript
const report = "https://{domain}.my.salesforce.com/{report}"
```

And also define the cookie string, by opening any of your Salesforce pages with DevTools in the Network tab, and right-click the `HTTP GET` request for the Salesforce page, Copy > Copy as cURL.

Then, from that command, extract the `Cookie` header value and paste as the value for `cookieString`.

______

### Execution

The results are encapsulated in lists, specifically lists of maps.

The idea is to breakdown each report, retrieve the table, break it down by rows and finally by each column.

To better organize this for a modular approach (where your reports can have very little and many rows), this map / matrix structure seems the best even though a bit verbose.

There are two main methods: 
- `SalesforceGetReport(cookie, report)`
- `SalesforceListReports(cookie, reportsList)`

The first will only scrape one report URL, the latter will cycle through a list of strings (URLs) instead.

Taking `SalesforceListReports()` as reference, the encapsulation is the following:
* reports (a list)
  * entries (a list)
    * columns / content objects (objects with a type and content key)
      * if type is urlData, then content will be a list of content objects for url, and data

Here is an example of the `test()` function, which provides a clear picture of the returned content:

```javascript
function test() {
  reports = sfq.SalesforceListReports(cookieString, reportsList)
  
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
```
