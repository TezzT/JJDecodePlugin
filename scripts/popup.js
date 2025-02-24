// ==================== COMMON FUNCTIONS ====================

// Function to copy text to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// Function to temporarily update button text
function updateButtonText(button, newText, duration = 1500) {
  const originalText = button.innerText;
  button.innerText = newText;
  setTimeout(() => {
    button.innerText = originalText;
  }, duration);
}

// ==================== FIND KEY FUNCTIONALITY ====================

// Button click handler for "Find Key"
document.getElementById("findKey").addEventListener("click", async () => {
  const findKeyButton = document.getElementById("findKey");

  try {
    // Call the key finder function and get the result
    const key = await findKeyAndHandleResults();

    if (key) {
      // Copy the key to clipboard
      copyToClipboard(key);

      // Update button text temporarily
      updateButtonText(findKeyButton, `Copied: ${key}`);
    } else {
      // If nothing found, show message temporarily
      updateButtonText(findKeyButton, "Nothing Found");
    }
  } catch (error) {
    // console.error("Error finding key:", error);
    updateButtonText(findKeyButton, "Key Not Found");
  }
});

// Function to find the key and handle multiple results
function findKeyAndHandleResults() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0].id;

      // Inject the searchContent function into the active tab
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab },
          function: searchContent,
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          // Handle results
          if (results && results[0] && results[0].result.length > 0) {
            const uniqueResults = [...new Set(results[0].result)];
            if (uniqueResults.length > 0) {
              const key = uniqueResults[0]; // Take the first result
              resolve(key);
            } else {
              resolve(null); // No unique results found
            }
          } else {
            resolve(null); // No results found
          }
        }
      );
    });
  });
}

// Function to search for the specific content (key)
function searchContent() {
  const regex = /url\('\/\/static\.jjwxc\.net\/tmp\/fonts\/jjwxcfont_(\w+)\.woff2\?h=my\.jjwxc\.net'\) format\('woff2'\)/g;
  const elements = document.querySelectorAll("*");
  const matches = [];

  elements.forEach((element) => {
    const elementMatches = element.innerHTML.match(regex);
    if (elementMatches) {
      elementMatches.forEach((match) => {
        const randomString = match.match(/jjwxcfont_(\w+)\.woff2/);
        if (randomString && randomString[1]) {
          matches.push(randomString[1]);
        }
      });
    }
  });

  return matches;
}

// ==================== COPY CONTENT FUNCTIONALITY ====================

// Button click handler for "Copy Content"
document.getElementById("copyContent").addEventListener("click", async () => {
  const copyContentButton = document.getElementById("copyContent");

  try {
    // Call the content finder function and get the result
    const content = await findContentAndCopy();

    if (content) {
      // Copy the content to clipboard
      copyToClipboard(content);

      // Update button text temporarily
      updateButtonText(copyContentButton, "Copied Content");
    } else {
      // If nothing found, show message temporarily
      updateButtonText(copyContentButton, "Nothing Found");
    }
  } catch (error) {
    updateButtonText(copyContentButton, "Content Not Found");
  }
});

// Function to find the content and return it
function findContentAndCopy() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0].id;

      // Inject the copyContentText function into the active tab
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab },
          function: copyContentText,
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          // Handle results from primary search
          if (results && results[0] && results[0].result) {
            resolve(results[0].result); // Return the content from the primary search
          } else {
            // If primary content not found, search inside the fallback div
            chrome.scripting.executeScript(
              {
                target: { tabId: activeTab },
                function: copyFallbackText,
              },
              (fallbackResults) => {
                if (fallbackResults && fallbackResults[0] && fallbackResults[0].result) {
                  resolve(fallbackResults[0].result); // Return the content from fallback
                } else {
                  resolve(null); // No content found
                }
              }
            );
          }
        }
      );
    });
  });
}

// ==================== PRIMARY SEARCH FUNCTION ====================

function copyContentText() {
  // Get the div with an id starting with content_
  const contentDiv = document.querySelector('div[id^="content_"]');

  if (contentDiv) {
    let fullText = "";

    // Iterate through child nodes of the contentDiv
    contentDiv.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        fullText += node.textContent; // Keep original spaces and newlines
      } else if (node.tagName === "SPAN") {
        // Extract ::before content
        const beforeStyle = window.getComputedStyle(node, "::before");
        const beforeText = beforeStyle && beforeStyle.content && beforeStyle.content !== "none" && beforeStyle.content !== '""' 
          ? beforeStyle.content.replace(/['"]/g, '')  // Remove quotes
          : "";

        // Extract the text inside <span>
        const spanText = node.textContent; // Keep spaces and line breaks

        // Extract ::after content
        const afterStyle = window.getComputedStyle(node, "::after");
        const afterText = afterStyle && afterStyle.content && afterStyle.content !== "none" && afterStyle.content !== '""' 
          ? afterStyle.content.replace(/['"]/g, '') 
          : "";

        // Combine everything in correct order
        fullText += beforeText + spanText + afterText;
      } else if (node.tagName === "BR") {
        fullText += "\n"; // Preserve line breaks
      }
    });

    return fullText.trim(); // Return the extracted text
  }
  return null; // Return null if no content is found
}
// ==================== FALLBACK SEARCH FUNCTION ====================

function copyFallbackText() {
  const className = "novelbody";
  const elements = document.querySelectorAll(`.${className}`);

  for (let el of elements) {
    const children = Array.from(el.children);
    const divChildren = children.filter(child => child.tagName === "DIV");

    if (divChildren.length === 1 && children.length === 1) {
      const mainDiv = divChildren[0]; // The only direct div

      // Extract text while keeping whitespace (including newlines)
      let extractedText = "";
      mainDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          extractedText += node.nodeValue;
        } else if (node.tagName === "BR") {
          extractedText += "\n"; // Convert <br> to a line break
        }
      });

      return extractedText.trim(); // Return text with line breaks preserved
    }
  }
  return null; // If no valid element found
}

// ==================== COPY AND SEND FUNCTIONALITY ====================

// Button click handler for "Copy and Send"
document.getElementById("copySend").addEventListener("click", async () => {
  const copySendButton = document.getElementById("copySend");

  try {
    // Step 1: Copy the content
    const content = await findContentAndCopy();

    if (content) {
      // Step 2: Find the key
      const key = await findKeyAndHandleResults();

      if (key) {
        // Step 3: Open or find the JJDecoder tab
        const jjDecoderTab = await openOrFindJJDecoderTab();

        if (jjDecoderTab) {
          // Step 4: Send both the content and the key to the JJDecoder tab
          await sendContentToTab(jjDecoderTab.id, content, key);

          // Update button text temporarily
          updateButtonText(copySendButton, "Content and Key Sent");
        } else {
          // If JJDecoder tab is not found or cannot be opened
          updateButtonText(copySendButton, "JJDecoder Tab Not Found");
        }
      } else {
        // If no key is found
        updateButtonText(copySendButton, "Key Not Found");
      }
    } else {
      // If no content is found
      updateButtonText(copySendButton, "Nothing Found");
    }
  } catch (error) {
    //console.error("Error in Copy and Send:", error);
    updateButtonText(copySendButton, "Nothing Found");
  }
});

// Function to open or find the JJDecoder tab
function openOrFindJJDecoderTab() {
  return new Promise((resolve, reject) => {
    // Search for an already opened tab with the title "JJDecoder"
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      const jjDecoderTab = tabs.find(tab => tab.title.includes("JJDecoder"));

      if (jjDecoderTab) {
        // If a JJDecoder tab is already open, activate it
        chrome.tabs.update(jjDecoderTab.id, { active: true }, (updatedTab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(updatedTab);
        });
      } else {
        // If no JJDecoder tab is open, open a new one
        chrome.tabs.create({ url: "https://tezzt.github.io/html-portfolio/" }, (newTab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(newTab);
        });
      }
    });
  });
}


// Function to send content and key to a specific tab
function sendContentToTab(tabId, content, key) {
  return new Promise((resolve, reject) => {
    // Inject a script into the target tab to handle the content and key
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: (content, key) => {
          // Simulate pasting into the content div
          const contentDiv = document.getElementById("inputContent1");
          if (contentDiv) {
            contentDiv.innerText = content; // Set the content
            const pasteEvent = new Event("input", { bubbles: true });
            contentDiv.dispatchEvent(pasteEvent); // Trigger input event
          }

          // Simulate pasting into the key div
          const keyDiv = document.getElementById("keyInput");
          if (keyDiv) {
            keyDiv.innerText = key; // Set the key
            const pasteEvent = new Event("input", { bubbles: true });
            keyDiv.dispatchEvent(pasteEvent); // Trigger input event
          }
        },
        args: [content, key], // Pass the content and key as arguments
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(results);
      }
    );
  });
}