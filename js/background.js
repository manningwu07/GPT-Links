// Function to handle messages from gpt.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.command === "getExtractionState") {
        chrome.storage.local.get("allowExtraction", function(data) {
            const allowExtraction = data.allowExtraction !== undefined ? data.allowExtraction : false;
            sendResponse({ allowExtraction });
        });
        return true;
    }
});

// Upcoming Feature: determine if link is yt, drive, pdf, or website. (Find some common links for information reference and have special commands for efficency reasons)
// Create sets of functions to determine

