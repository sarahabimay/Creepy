# Creepy
# A Simple Web Crawler using Node.JS 

## Design Decisions (so far)
1. Use Javascript for client-side
2. Use Node.JS for server side crawling code.
3. Want to display a site map style image of all static assets used by the domain
  - static assets should include: CSS files, Scripts/Libraries, and Images, Video, Audio and Links (QUESTION: anything else?)
  - I envisage 4 branches of the site map, one for each type of static asset with each path displayed under each      branch.
  
  StyleSheets | Scripts | Images/Video/Audio | Paths
  --- | --- | --- | ---
  /assets/../local.css | /assets/../app.js | /assets/../../brand.png | http://go-cardless.com/about
  http://../bootstrap.css | http://../../angular.min.js | http://..favicon*/.. | http://go-cardless.com/contact

4. Use a local data store (an object possibly) in server for caching scraped/crawled paths
  - Object or db would need to take the form: 
``` 
{ 
    
    "StyleSheet" : { path: true, path, true ... }, 

    "Scripts" : { path: true, ...},
    
    "Images"  : { path :true, ...,.. },
    
    "Pages"   : { path: true, .., .. },
    
  } 
  ```
5. Use regex for searching for src/href path; with or without the root URL. e.g. http://xxxx.xxx.xxx/* and          anything beginning with '/*' (like /path/* or /assets/*) for example
6. Use a template (Jade) for server-side rendering of results

### Front-End
- Title and instructions telling user to enter a URL to see it's static assets structure
- Simple form with a text box and a button for submitting the URL
- Need to check URL validity of given URL
- Need to check the URL is a real URL using a regex
  - If not well formed e.g. isn't something like: something.* then give an Alert to User
  - If well formed URL string but we get a 401 then let the user know with an Alert 
  - If we get a 200 then carry on and display the results (if results have been server-side rendered)
  
### Server 
#### This is my thinking before doing any research/tutorials about building a web crawler
- Server gets a Request from client and extracts the search URL
- Server makes a GET request on the URL; if it gets back a 200 we should have the HTML of the first page.
- The HTML needs to be searched for each of the static asset types and their paths will be added to the data store (if not dupes). 
- Any http(s) links found that are for the Search URL (and are not CSS, Images/etc or Scripts) need to then be requested and the filtering process repeated.
- The following is the order I'm initially thinking the filtering should take:
  1. Search for all (local and external) stylesheets - not sure what the regexp/JSON search should be yet
  2. Search for all (local and external) scripts - not sure what the regexp search should be yet
  3. Search for all `<img>` tags (this will get local and external ones) or just .gif, .jpg, .png?  QUESTION: Where else can Images be found ?  What about videos?  What about Audio??
  4. Search for anything beginning with http:// or https://
    - this will bring a LOT of results and they will also include Scripts, StyleSheets and Images/Video/Audio 
    - Question : Can I find an exhaustive way of filtering out Scripts, CSS and Images/Video/Audio if I've already found them ?
    - Any found links need to be checked for dupes in the data store and be discarded if duped.
    - Any links that aren't duped need to be added to the data store
    - Any links that don't have the host name searched for should be added to the data store (if not duped) and then skipped.
    - Any links for the host name searched for should be added to the data store and then collated in a local object (Links) until all of the links have been filtered.
    - The 'Links' need to be requested one by one, repeating the above steps.
- After all of the pages have been scraped (and we've left the request's response callback):
  1. we should check again for any dupes and remove them.
  2. sort each category of static asset 
  3. use Jade templating to generate a site map
  

### Problems/Questions
1. How to do the searching for the different asset types efficiently and exhaustively.
2. Am I missing any types of static type? I have thought of CSS, Scripts (.js), Images, Videos, Audio and links
3. Is using an object as a data store the way to go?  I don't really want a global var.  Maybe use some other caching or redis.


### Stretch Goal
1. The way I have designed this is in effect single-threaded and one page is scraped at a time.  Would be cool to scrape multiple pages at the same time.  This would bring with it problems of race conditions when checking for dupes but that could be sorted out at the end of each 'pass' of a page.


  




