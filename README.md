# Creepy
# A Simple Web Crawler using Node.JS 


## Instructions for use
1. `git clone repo`
2. `npm install` to install all the node modules
3. `node app.js` to run the server
4. In a browser navigate to `localhost:3000`
5. Enter a HostName into the text box e.g a URL starting http://www.
6. Click the button and wait for what seems like ages for your results.


---

## Known Issues - and out of time to dig into further.
1. Timeout issue with slow internet connections 
    If a site is large and the internet speed is slow then the client's request may timeout before the server can reply.  If this happens the server will continue working until it replies but the reply will not be handled in the server.
2. More than one search initiated.  
  - If more than one search is initiated or the homepage refreshed then the first request will still carry on processing till completion in the server, but the reply will be ignored by the client.
  - As a stop gap I have disabled the button so a new search cannot be instigated but there's nowt I can do about a page refresh!

## Design Decisions (so far)
1. Use Javascript for client-side
2. Use Node.JS for server side crawling code.
3. Want to display a site map style image of all static assets used by the domain
  - static assets should include: CSS files, Scripts/Libraries, and Images,[ Video, Audio] and Links (QUESTION: anything else?)
  - I envisage 4 branches of the site map, one for each type of static asset with each path displayed under each      branch.
  
  StyleSheets | Scripts | Images/Video/Audio | Paths
  --- | --- | --- | ---
  /assets/../local.css | /assets/../app.js | /assets/../../brand.png | http://go-cardless.com/about
  http://../bootstrap.css | http://../../angular.min.js | http://..favicon*/.. | http://go-cardless.com/contact

4. Use a global namespace data store (an object) in server for caching scraped/crawled paths/static files
  - Object or db would need to take the form: 
``` 
var globalListCSS = 
{ 
    "path/to/css/file : true,
    "another/path/css" : true,
};
var globalListScripts = 
{
    "path/to/script.js" : true,
};
var globalListImages =
{
    "path/to/image.png"  : true,
};
var globalListOfURLs = 
{
    "httP://www.gocardless.com"   : true,
    "http://www.gocardless.com/blog" :true,
};
    
  ```
5. For scraping href's from the HTML I will use npm module `cheerio`.  I will search for anchor 'a' tags and record any urls (canonical and relative paths) which are relevant the the starting search HostName and ignore any external URL's.  
  I discovered that using RegEx on HTML is a big 'No-NO'. 
6. I will use npm module `request` to make GET request to URL's in the globalCacheOfURLs.
7. Using cheerio again I will look for CSS, Scripts and IMG files and store in their global lists.
8. When a URL has been 'scraped' I will update it's property in the globalCacheofURLs to have the value 'true'
8. When all properties in globalCacheOfURLs are true then the scraping is finished and we can render the results.
9. Use a template (Jade) for server-side rendering of results

### Front-End
- Title and instructions telling user to enter a URL to see it's static assets structure
- Simple form with a text box and a button for submitting the URL
- Need to check URL validity of given URL
- Need to check the URL is a real URL using a regex
  - If not well formed e.g. isn't something like: something.* then give an Alert to User
  - If well formed URL string but we get a 401 then let the user know with an Alert 
  - If we get a 200 then carry on and display the results (if results have been server-side rendered
- Want to have a little animation of a sand timer or something while we wait for the results.
  
### Server 
#### This is my thinking before doing any research/tutorials about building a web crawler
- Server gets a request from client and extracts the search URL
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

#### This is my thinking after doing research and after starting to code
- Server gets a request from client and extracts the search URL
- Server makes a GET request on the URL; if it gets back a 200 we should have the HTML of the first page.
- The HTML needs to be searched for each of the static asset types and their paths will be added to the data store (if not dupes). 
- Any http(s) links found that are for the Search URL (and are not CSS, Images/etc or Scripts) need to then be requested and the filtering process repeated.
- The following is the order I'm initially thinking the filtering should take:
  1. Search for all (local and external) stylesheets - **not using regexp but using cheerio instead**
  2. Search for all (local and external) scripts - **not using regexp but using cheerio instead**
  3. Search for all `<img>` tags (this will get local and external ones) or just .gif, .jpg, .png?  QUESTION: Where else can Images be found ?  What about videos?  What about Audio?? - **haven't had time to look into these questions!!**
  4. Search for other URL links - **not using regexp but using cheerio to strip out <a> anchor tags**
    - Any found links need to be checked for dupes in the data store and be discarded if duped.
    - Any links that aren't duped need to be added to the data store
    - Any links that don't have the host name searched for should be added to the data store (if not duped) and then skipped.
    - **Any links with the host name searched for in it's path should be added to the data store**
    - **Any links added to the data store are entered with a 'false' value until they have been scraped.**
    - The 'Links' need to be requested one by one, repeating the above steps.
- After all of the pages have been scraped (and we've left the request's response callback):
  1. sort each category of static asset - **haven't done this**
  2. use Jade templating to generate a site map - **I'm using a StyleSheet for sitemaps that I found.** 

### Problems/Questions
1. How to do the searching for the different asset types efficiently and exhaustively.
  - **Answer - Using Cheerio !**
2. Am I missing any types of static type? I have thought of CSS, Scripts (.js), Images, Videos, Audio and links
3. Is using an object as a data store the way to go?  I don't really want a global var.  Maybe use some other caching or redis.
  - **Answer - There are definitely better ways to go about it I'm sure (like sylv(sp)'s node-crawler module which uses Pools.)**
4.  **I had a biiiig problem with Node.js's asynchronous nature with regards to doing GET requests for all of the URL's.  It took me a while to work out how to establish when all of the URL's had been scraped and when to generate the sitemap.**
5.  **PROBLEM: The scraper works but is slow.  I have really bad internet speed at the moment and sometimes there is a timeout and the sitemap doesn't get displayed.**


### Stretch Goal
1. **The way I have designed this, it is incredibly slow.  Maybe the sitemap could be updated dynamically as it is scraped instead of when the entire site has been scraped.**


  




