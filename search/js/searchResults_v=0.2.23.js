// code displayer
function populateSearchResults(query, searchResults, err) {
    if (!searchResults || err) {
        if (err) {
            pathSearchResultsContainer.innerHTML = `<div style='width: 100%; height: 400px; text-align: center;'><p style= "position: relative; top: 190px;">something went wrong</p></div>`
            pathSearchResultsContainer.style.display = 'block'
        } else {
            pathSearchResultsContainer.innerHTML = null
            pathSearchResultsContainer.style.display = 'none'
        }

        codeSearchResultsContainer.innerHTML = null
        codeSearchResultsContainer.style.display = 'none'
        return
    }

    if (searchResults.results.length === 0) {
        pathSearchResultsContainer.innerHTML = `<div style='width: 100%; height: 400px; text-align: center;'><p style= "position: relative; top: 190px;">no results</p></div>`
        pathSearchResultsContainer.style.display = 'block'
        codeSearchResultsContainer.innerHTML = null
        codeSearchResultsContainer.style.display = 'none'
        return
    }

    // console.log(searchResult);
    const pathResults = searchResults.results.filter(searchResult => !searchResult.lines)
    const codeResults = searchResults.results.filter(searchResult => searchResult.lines)

    function htmlHighlightMatchesInString(str, query) {
        var str = str
        var regex
        const regexOptions = isCaseSensitive() ? 'g' : 'gi'
        if (isRegex()) {
            regex = RegExp(query, regexOptions)
        } else {
            regex = RegExp(escapeRegExp(query), regexOptions)
        }

        const ranges = mergeOverlappingRanges(regexRangesInString(regex, str))
        // console.log(ranges);
        for(var j = 0; j <ranges.length; j++) {
            var range = ranges[ranges.length - 1 - j]
            str = str.splice(range[1], 0, '</mark>')
            str = str.splice(range[0], 0, '<mark>')
        }
        return str
    }

    // console.log(query)
    // console.log(lastRawQuery)

    var pathSearchResultsHTML = "<h4>Paths</h4><br>"
    if (pathResults.length == 0) {
        pathSearchResultsHTML = null
        pathSearchResultsContainer.style.display = 'none'
    } else {
        pathSearchResultsContainer.style.display = 'block'
    }

    for(let i = 0; i <pathResults.length; i++) {
        const searchResult = pathResults[i]
        pathSearchResultsHTML +=
        `<div id='path-search-result-${i}' class='search-result'>` +
        `<a class='search-result-link' href='#' onclick='fileLookup("${searchResult.localURL}", "${searchResult.repoID}")'>` +
        urlWithBoldedLastComponent(searchResult.localURL) +
        "</a>" +
        "</div>"
    }
    pathSearchResultsContainer.innerHTML = pathSearchResultsHTML

    var codeSearchResultsHTML = "<h4>Code</h4><br>"
    if (codeResults.length == 0) {
        codeSearchResultsHTML = null
        codeSearchResultsContainer.style.display = 'none'
    } else {
        codeSearchResultsContainer.style.display = 'block'
    }
    for(let i = 0; i <codeResults.length; i++) {
        const searchResult = codeResults[i]

        let lineIndex = 0
        let searchResultContent = searchResult.lines.map(function(lineObject) {
            let line = lineObject.string
            line = escapeHtml(line)

            // if (fuzzyComponents) {
            //     for (const component of fuzzyComponents) {
            //         line = htmlHighlightMatchesInString(line, escapeHtml(component), undefined, true)
            //     }
            // } else {
                line = htmlHighlightMatchesInString(line, escapeHtml(query))
            // }
            
            line = `<span class='code-line' onclick='fileLookup("${searchResult.localURL}", "${searchResult.repoID}", "${lineObject.lineNumber}")'>${line}</span>`

            // figures out context separators for non-consecutive lines
            if (lineIndex > 0) {
                const prevLineObject = searchResult.lines[lineIndex - 1]
                if (lineObject.lineNumber - 1 != prevLineObject.lineNumber) {
                    line = `<hr class='code-separator'>\n` + line
                } else {
                    line = line
                }
            }
            lineIndex += 1
            return line
        }).join('\n').trim()

        function matchString() {
            if (!searchResult.numberOfMatches) {return ''}
            const plurality = searchResult.numberOfMatches > 1 ? ' matches' : ' match'
            if (searchResult.numberOfMatches > searchResult.numberOfMatchesShown) {
                return `<span class='ui-text-small non-breaking'> ${searchResult.numberOfMatchesShown + '+ ' + plurality}</span>`
            } else {
                return `<span class='ui-text-small non-breaking'> ${searchResult.numberOfMatches + plurality}</span>`
            }
            
        }

        // function functionUI() {
        //     return searchResult.func && searchResult.func.name ? `<br><a>in ${searchResult.func.name}</a>` : ''
        // }

        codeSearchResultsHTML +=
        `<div id='code-search-result-${i}' class='search-result'>` +
        `<div class='search-result-header'><a class='search-result-link' href='#' onclick='fileLookup("${searchResult.localURL}", "${searchResult.repoID}")'>` +
        urlWithBoldedLastComponent(searchResult.localURL) +
        '</a>' + matchString() +
        "</div>" +
        // "<a class='search-result-taxonomy'>in functionName</a>" +
        "<pre id='code" + i + "'><code>" + searchResultContent + "</code></pre>" +
        "</div>"
    }
    codeSearchResultsContainer.innerHTML = codeSearchResultsHTML

    for(let i = 0; i <codeResults.length; i++) {
        const searchResult1 = codeResults[i]
        let lineNumbers = []
        let previousLineNumber
        searchResult1.lines.forEach(function(line) {
            if ((previousLineNumber) && previousLineNumber + 1 != line.lineNumber && previousLineNumber != line.lineNumber) {
                lineNumbers.push(null)
            }
            lineNumbers.push(line.lineNumber)
            previousLineNumber = line.lineNumber
        })
        setLineNumbers("code" + i, lineNumbers)
    }
}

function escapeHtml(unsafe) {
    if (unsafe == undefined) {
        return ""
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
}

function setLineNumbers(codeID, lineNumbers) {
    let codeObject = document.getElementById(codeID)
    if (codeObject == null) {
      return
    }
    codeObject.innerHTML = "<span class='line-number'></span>" + codeObject.innerHTML + "<span class='cl'></span>"
    // let num = codeObject.innerHTML.split(/\n/).length
    for (let j = 0; j < lineNumbers.length; j++) {
        const lineNumber = lineNumbers[j]
        let line_num = codeObject.getElementsByTagName('span')[0];
        if (lineNumber) {
            line_num.innerHTML += `<span class='line-link'>` + lineNumber + '</span>';
        } else {
            line_num.innerHTML += `<span><hr class='code-separator'></span>`;
        }
    }
}

function urlWithBoldedLastComponent(url) {
    const lastBackslackIndex = url.lastIndexOf('/')
    const lastPathComponent = url.substring(lastBackslackIndex + 1)
    return url.substring(0, lastBackslackIndex + 1) + '<strong>' + lastPathComponent + '</strong>'
}

// returns { lineNumber: lineContent }
function linesForRangesInString(str, ranges) {
    function lineNumberOfLocationInString(str, location) {
        return str.substring(0, location).split('\n').length
    }

    var lines = {}
    for(var i = 0; i <ranges.length; i++) {
        const range = ranges[i]
        const lowerBoundLineNumber = lineNumberOfLocationInString(str, range[0])
        const upperBoundLineNumber = lineNumberOfLocationInString(str, range[1])
        const stringAsLines = str.split('\n')

        for (j = lowerBoundLineNumber; j <(upperBoundLineNumber + 1); j++) {
            lines[j] = stringAsLines[j - 1]
        }
    }
    return lines
}

function regexRangesInString(regex, sourceString) {
    var regex = regex
    var ranges = []
    var matches

    // regex pattern must contain 'g' delimiter for this to work
    while ((matches = regex.exec(sourceString)) !== null) {
        const range = [regex.lastIndex - matches[0].length, regex.lastIndex]
        ranges.push(range)
    }
    return ranges
}

function mergeOverlappingRanges(ranges) {
    if (ranges.length == 0) {
        return []
    }

    function numbersBetween(lowEnd, highEnd) {
        var list = []
        for (var i = lowEnd; i <= highEnd; i++) {
            list.push(i)
        }
        return list
    }

    var enumeratedRangesRaw = []
    for(var i = 0; i < ranges.length; i++) {
        const range = ranges[i]
        const numbers = numbersBetween(range[0], range[1])
        enumeratedRangesRaw.push(numbers)
    }
    var enumeratedRanges = Array.from(new Set(enumeratedRangesRaw.flat()))
    enumeratedRanges.sort(function(a, b){return a - b})

    var newRanges = []
    var latestStartPoint
    for(var i = 0; i < enumeratedRanges.length; i++) {
        if (i == 0) {
            latestStartPoint = enumeratedRanges[i]
            continue
        }

        if (enumeratedRanges[i] != enumeratedRanges[i - 1] + 1) {
            newRanges.push([latestStartPoint, enumeratedRanges[i - 1]])
            latestStartPoint = enumeratedRanges[i]
        }

        if (latestStartPoint == enumeratedRanges[enumeratedRanges.length - 1]) {
            newRanges.push([latestStartPoint, latestStartPoint])
        } else if (i == enumeratedRanges.length - 1) {
            newRanges.push([latestStartPoint, enumeratedRanges[i]])
        }
    }
    return newRanges
}

String.prototype.splice = function(idx, rem, str) {
    return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
