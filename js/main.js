// Variable to store the state of the extractor
let allowExtraction = true;

// Function to toggle extractor state
function toggleExtractor() {
    allowExtraction = !allowExtraction;
    // Save the state to storage
    chrome.storage.local.set({ allowExtraction });
}

// Add event listener to the checkbox
document.getElementById("toggleExtractor").addEventListener("change", function() {
    toggleExtractor();
});

// Retrieve the state from storage when the page loads
chrome.storage.local.get("allowExtraction", function(data) {
    if (data.allowExtraction !== undefined) {
        allowExtraction = data.allowExtraction;
        document.getElementById("toggleExtractor").checked = allowExtraction;
    }
});
