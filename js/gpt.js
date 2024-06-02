console.log("GPT links loaded");
let clicker = document.querySelector('button[data-testid="send-button"] > span[data-state="closed"]');
const textBox = document.querySelector("#prompt-textarea");

// Function to extract links from text using regex
const extractLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex);
};

// Function to retrieve extraction state from background.js
const getExtractionState = () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ command: "getExtractionState" }, function (response) {
            resolve(response.allowExtraction);
        });
    });
};

// Usage 
getExtractionState().then(allowExtraction => {
    if (allowExtraction) {
        // Interval to scan textbox every second
        setInterval(() => {
            const urlRegex = /https:\/\/chatgpt.com.*/;
            if (urlRegex.test(location.href)) {
                if (textBox) {
                    const textContent = textBox.value;
                    const links = extractLinks(textContent);
                    if (links) {
                        updateUrls(links);
                    }
                }
            }
        }, 50);
        clicker.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', enterKeyDownHandler, true);
    }
});



let data;
// Listen for messages from background.js
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.command === "updateScrapedData") {
        data = request.data;
    }
});








// Check if the user has clicked enter

// Function to click the button with a delay
const appendWordsOntoTextBox = (words) => {
    return new Promise((resolve) => {
        // Splice the words parameter into two parts
        const chunks = words.split('`');

        // Simulate typing the first part with a delay
        for (let i = 0; i < chunks.length; i++) {
            setTimeout(() => {
                const chunk = chunks[i];
                textBox.value += chunk; // Append word with space
                textBox.dispatchEvent(new Event('input', { bubbles: true }));

                // Resolve the promise after typing the last char of the first part
                if (i === chunks.length - 1) {
                    textBox.value += "\n\n\n your output/response will be the words 'ok' and nothing else";
                    resolve();
                }
            }, i * 30);
        }
    });
};



async function checkClickerState() {
    // Checks if button exists for button.click() to work
    return new Promise((resolve) => {
        setInterval(() => {
            const sendButton = document.querySelector('button[data-testid="send-button"] > span[data-state="closed"]');
            if (sendButton) {
                clicker = document.querySelector('button[data-testid="send-button"] > span[data-state="closed"]');
                clearInterval(this);
                resolve();
            }
        }, 50);
    });
}


async function processWebsite(data) {
    for (const [url, contentArray] of Object.entries(data)) {
        // Trims protocol to make it a little less ugly
        const domain = url.replace(protocolRegex, '');
        textBox.value = `\nThe following content is from: \n\n ${domain}\n\n`;
        for (let i = 0; i < contentArray.length; i++) {
            await new Promise(async (resolve) => {
                await appendWordsOntoTextBox(contentArray[i]);
                await checkClickerState();
                clicker.click();
                // wait for text to be sent to gpt before typing again.
                setInterval(() => {
                    const gptRecieved = document.querySelector('button[aria-label="Stop generating"]');
                    if (gptRecieved) {
                        clearInterval(this);
                        resolve();
                    }
                }, 50);
            });
        }
    }
}

async function handleClickInteraction() {
    return new Promise(async (resolve) => {
        // Interacting with textBox Values
        let userInput = textBox.value;
        textBox.value = "";

        let data = await returnData();
        if (Object.entries(data).length !== 0) {
            await processWebsite(data);
            await checkClickerState();
            await new Promise(async (resolve) => {
                // Append the user input after all the scraped content
                const userInputWithoutURLs = userInput.replace(/https?:\/\/\S+/g, ''); // must remove the URLS or else it loops again which is annoying
                const request = "Don't say 'ok' anymore, here's the request to respond to: \n\n" + userInputWithoutURLs;
                const words = request.split(' ');
                for (let i = 0; i < words.length; i++) {
                    setTimeout(() => {
                        textBox.value += words[i] + ' '; // Append word followed by space
                        textBox.dispatchEvent(new Event('input', { bubbles: true }));
                    }, i * 10);
                }
                resolve();

            });
            clicker.click();
        } else {
            textBox.value += userInput;
            await checkClickerState();
            clicker.click();
        }

        resolve();
    });
}

const protocolRegex = /^(https?:\/\/)?/i;

// Function to execute when the button is clicked or Enter is pressed
const handleClick = async (event) => {
    // Have this as priority over the others
    event.preventDefault();
    event.stopPropagation();
    // Prevent recursion
    clicker.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', enterKeyDownHandler, true);
    await handleClickInteraction();

    clicker.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', enterKeyDownHandler, true);


};

// Event listener function for Enter keydown
const enterKeyDownHandler = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        handleClick(event);
    }
};





















// Webscrape the website
let scrapedData = {};
let urls = [];

// By pasing CORS
const corsAnywhereUrl = 'https://cors-anywhere.herokuapp.com/';

// Youtube start and end times
let startTime = null;
let endTime = null;

function updateUrls(links) {
    for (let i = links.length - 1; i >= 0; i--) {
        const lastUrl = links[i];
        if (lastUrl && (!urls.includes(lastUrl) && urls.length < 5)) {
            urls.push(lastUrl);
            scrapeData(lastUrl);
        }
    }
}

async function returnData() {
    const temp = scrapedData;
    scrapedData = {};
    urls = [];
    return temp || {};
}

/*
// Array to store promises returned by scrapeData
const scrapePromises = urls.map((url) => scrapeData(url));

// Wait for all scrapeData calls to finish
Promise.all(scrapePromises).then(() => {
    console.log(scrapedData);
});

// Send scraped data to background.js
chrome.runtime.sendMessage({ command: "scrapedData", data: scrapedData });
*/

// Function to scrape data from a URL and store it in the object
async function scrapeData(url) {
    let content = [];
    /*
    if (isYouTubeLink(url)) {
        // Scrape data from YouTube link
        content = await scrapeYouTube(url, startTime, endTime);
    } else {*/
    // Make HTTP request to the URL and get HTML response
    try {
        const response = await fetch(corsAnywhereUrl + url);
        const html = await response.text();
        content = scrapeHTML(html);
    } catch (error) {
        console.error('Error scraping data:', error);
    }
    //}
    // Store the scraped data in the object
    const domain = url.replace(protocolRegex, '')
    scrapedData[domain] = content;
}

// Main scraping function for HTML
function scrapeHTML(html) {
    const cleanedHTML = preprocessHTML(html);
    const extractedText = extractTextHTML(cleanedHTML);
    return extractedText;
}

// Function to preprocess HTML
function preprocessHTML(html) {
    // Extract content within the <body> tag without the body tags
    const bodyContentMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyContentMatch ? bodyContentMatch[1] : '';

    // Remove styles, comments, scripts, and meta tags and newlines
    let processedHTML = bodyContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<meta\b[^<]*(?:(?!>)[^<]*)*>/gi, '')
        .replace(/\n+/g, '\n').trim()
        .replace(/\n\n+/g, '\n\n\n');

    return processedHTML;
}


const textElements = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'code', 'a', ''];
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Function to extract text from HTML and split into chunks of 3000 characters
function extractTextHTML(html) {
    // Iterate through text elements
    textElements.forEach(function (element) {
        // Construct regex pattern to match the entire HTML element
        const regex = new RegExp('<' + element + '\\b[^<]*(?:(?!<\\/' + element + '>)<[^<]*)*<\\/' + element + '>', 'gi');

        // Replace matches with a space added after the element's content, followed by the delimiter
        html = html.replace(regex, function (match) {
            return match.trim() + '!&%';
        });
    });

    // Remove HTML tags
    let cleanText = html.replace(/<[^>]+>/g, '').trim();

    // Remove URLs
    cleanText = cleanText.replace(urlRegex, '');

    // Filter out empty chunks
    const chunks = cleanText.split(/[!&%]/);
    const filteredChunks = chunks.filter(chunk => chunk.trim().length > 0);

    // Filter based off of character length
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < filteredChunks.length; i++) {
        if (filteredChunks[i].split(/\s+/).length >= 15) { // int is word count threshold
            if (startIdx === -1) {
                startIdx = i;
            }
            endIdx = i;
        }
    }

    // Extract content between first and last instances passing threshold
    cleanText = filteredChunks.slice(startIdx, endIdx + 1).join(' ');
    return chunkText(cleanText);
}


function chunkText(text) {
    const textChunks = [];
    // Split text into chunks of 4000 characters with "`" added every 100 characters
    for (let i = 0; i < text.length; i += 4000) {
        let chunk = text.substr(i, 4000);
        for (let j = 50; j < chunk.length; j += 50) {
            chunk = chunk.substr(0, j) + '`' + chunk.substr(j);
        }
        textChunks.push(chunk + '`');
    }
    return textChunks;
}






// YT Links
/*
// Function to check if a URL is a YouTube video link
function isYouTubeLink(url) {
    const urlObj = new URL(url);
    return (
        (urlObj.hostname.toLowerCase() === 'youtube.com' || urlObj.hostname.toLowerCase() === 'www.youtube.com') &&
        (urlObj.pathname.toLowerCase() === '/watch') &&
        (urlObj.search.toLowerCase().includes("?v="))
    );
}

// Function to scrape data from a YouTube video link
async function scrapeYouTube(url, startTime, endTime) {
    // Use YouTube Data API to retrieve transcript
    const html = await preprocessYouTubeHTML(url);
    const transcript = fetchTranscriptFromYouTube(html);

    if (!endTime && startTime) {
        const timestamps = Object.keys(transcript);
        const startIndex = timestamps.findIndex(timestamp => timestamp >= startTime);

        let startTimestamp = startTime;
        let endTimestamp = startTime;

        if (startIndex !== -1) {
            if (startIndex > 0) {
                startTimestamp = timestamps[startIndex - 1]; // Get the previous timestamp
            }
            endTimestamp = timestamps[startIndex]; // Get the current timestamp
            if (startIndex < timestamps.length - 1) {
                endTimestamp = timestamps[startIndex + 1]; // Get the next timestamp
            }
        } else {
            // Edge case: If startTime is beyond the last timestamp, select the last timestamp
            endTimestamp = timestamps[timestamps.length - 1];
        }

        // Fetch the transcript for the selected time range
        content = extractClipsFromTranscript(transcript, startTimestamp, endTimestamp);
    }

    // Get video duration if start and end times are not provided
    if (!startTime && !endTime) {
        startTime = '0:00';
        endTime = Object.keys(transcript)[Object.keys(transcript).length - 1]; // get the last index of the transcript for the time lol
    }

    // If time stamps or ranges are provided, extract corresponding clips
    let content = transcript;
    if (startTime && endTime) {
        content = extractClipsFromTranscript(transcript, startTime, endTime);
    }

    // Format content into chunks of 2800 characters
    const formattedContent = chunkText(content);
    // Reset the timers for next parsing
    startTime = null;
    endTime = null;
    return formattedContent;
}

async function preprocessYouTubeHTML(url) {
    const response = await fetch(url);
    let html = await response.text();
    // Remove header, script tags, img tags, link tags, and other unwanted tags
    html = html.replace(/<head[\s\S]*?<\/head>/gi, ''); // Remove header
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ''); // Remove script tags
    html = html.replace(/<img[\s\S]*?>/gi, ''); // Remove img tags
    html = html.replace(/<link[\s\S]*?>/gi, ''); // Remove link tags
    console.log("Line 165, YT HTML: ", html);
    // Return the preprocessed HTML
    return html;
}

function fetchTranscriptFromYouTube(html) {
    // Regular expression to match transcript contents
    const transcriptRegex = /<div class="segment-timestamp style-scope ytd-transcript-segment-renderer">([\s\S]*?)<\/div>\s*<yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">([\s\S]*?)<\/yt-formatted-string>/g;
    // Initialize an object to store the transcript content
    const transcriptContent = {};

    // Iterate through matches and extract timestamp and content
    let match;
    while ((match = transcriptRegex.exec(html)) !== null) {
        const timestamp = match[1].trim();
        const content = match[2].trim();
        transcriptContent[timestamp] = content;
        console.log("Transcript content: ", transcriptContent);
    }

    return transcriptContent;
}
*/
// Send back results in json

