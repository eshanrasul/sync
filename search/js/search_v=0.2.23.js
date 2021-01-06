// search management
var lastRawQuery = ''
var queryValidator = {}
var latestSuccessfulQueryTime = 0

function setStateForQuery(queryRaw, candidate) {
    queryValidator = candidate
    lastRawQuery = queryRaw
}

async function search(queryRaw, type, isCaseSensitive, showCodeContext, fileTypes) {
    var query = queryRaw
    // gtag('event', 'clicked_search')

    // query validation
    if (query.trim().length == 0) {
        populateSearchResults('', null, null)
        setStateForQuery(queryRaw, type, isCaseSensitive, showCodeContext)
        return false
    }

    const candidateFullQuery = JSON.stringify({queryRaw, type, isCaseSensitive, showCodeContext, fileTypes, selectedRepoID})
    if (queryValidator == candidateFullQuery) {
        return false
    }
    setStateForQuery(queryRaw, candidateFullQuery)

    // constructs query from parameters
    var params = { q: query }
    
    if (type) {
        params.type = type
    }
    if (isCaseSensitive) {
        params.isCaseSensitive = true
    }
    if (showCodeContext) {
        params.showCodeContext = true
    }
    if (selectedRepoID) {
        params.repoID = selectedRepoID
    }
    if (fileTypes) {
        params.fileTypes = fileTypes
    }

    var esc = encodeURIComponent
    var httpQuery = 'https://metacode.co:8080/v1/search?' + Object.keys(params)
        .map(k => esc(k) + '=' + esc(params[k]))
        .join('&')

    console.log(httpQuery)

    const capturedQuery = query
    const capturedTime = Date.now()
    populateSearchResults('', null, null)
    httpGetAsync(httpQuery, function (response, error) {
        if (latestSuccessfulQueryTime > capturedTime) {
            return
        }
        latestSuccessfulQueryTime = capturedTime
        const jsonResponse = error ? null : JSON.parse(response)
        // console.log(jsonResponse);
        populateSearchResults(capturedQuery, jsonResponse, error)
    })

    return false
}

function fetchRepositories() {
    const httpQuery = 'https://metacode.co:8080/v1/repos/'
    httpGetAsync(httpQuery, function (response) {
        if (!response) {
            repos = {}
            return
        }

        repos = JSON.parse(response).data
        setSelectedRepo(undefined)
    })
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            callback(xmlHttp.responseText)
        } else if (xmlHttp.readyState == 4) {
            callback(null, 'bad response')
        }
    }
    xmlHttp.open('GET', theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}

// search options management

function setSelectedRepo(id) {
    selectedRepoID = id
    repoDropdownButton.innerHTML = (id ? truncate(repos[id].name) : '(all repos)') +
    `<span class='arrow-container'><i class='arrow down'></i><span>`
    populateRepoDropdownContent: (() => {
        if (repos.size == 0) { return }
        let reposHTML = `<a class='clickable' onclick='setSelectedRepo()'>(all repos)</a>`
        // console.log(repos);
        
        Object.keys(repos).forEach((id) => {
            const repo = repos[id]
            reposHTML += `<a class='clickable' onclick='setSelectedRepo("${id}")'>${repo.name}</a>`
        })
        repoDropdownContent.innerHTML = reposHTML
    })()
    submitSearchForm()

    function truncate(input) {
        const threshold = 24
    if (input.length > threshold)
        return input.substring(0,threshold) + '…';
    else
        return input;
    };
}

function filterRepoDropdown() {
    const filterQuery = repoSearchInput.value.trim().toLowerCase()
    if (filterQuery.trim() === '') {
        resetRepoDropdown()
        return
    }
    for (const child of repoDropdownContent.children) {
        if (child.innerHTML.toLowerCase().includes(filterQuery) === false) {
            child.style.display = 'none'
        } else {
            child.style.display = 'block'
        }
    }
}

function resetRepoDropdown() {
    for (const child of repoDropdownContent.children) {
        child.style.display = 'block'
    }
}

var latestFileLookup = ''
var latestFileObject = undefined
function fileLookup(relativePath, repoID, lineNumber) {
    const params = {}
    if (relativePath) {
        params.q = relativePath
    }
    if (repoID) {
        params.repoID = repoID
    }

    if ((params.q && params.repoID) === false) {
        return
    }

    if (latestFileLookup == JSON.stringify(params)) {
        showPopupLoader()
        showFilePopup(latestFileObject, lineNumber)
        return
    }
    latestFileLookup = JSON.stringify(params)

    let esc = encodeURIComponent
    let httpQuery = 'https://metacode.co:8080/v1/file-lookup?' + Object.keys(params)
        .map(k => esc(k) + '=' + esc(params[k]))
        .join('&')

    showPopupLoader()
    httpGetAsync(httpQuery, (responseString, error) => {
        if (error) {
            latestFileObject = undefined
            return
        }
        const response = JSON.parse(responseString)
        if (response.results.length === 0) {
            latestFileObject = undefined
            // TODO: say 'no file found'
            return
        }
        const fileObject = response.results[0]
        latestFileObject = fileObject
        showFilePopup(fileObject, lineNumber)
    })
}