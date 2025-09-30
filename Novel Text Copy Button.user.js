// ==UserScript==
// @name         Novel Text Copy Button
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Adds a copy button to easily copy novel text and clicks the next chapter button, including the article title, supporting multiple next button texts, and ignoring specific footer content. Now with specific support for 69shuba.com.
// @author       You (with modifications)
// @match        *://**/*
// @grant        GM.setClipboard
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // Function to find the novel content container and title using a list of possible selectors.
    function getNovelContentAndTitleElements() {
        const contentSelectors = [
            '#novel_content',    // The original selector
            '.chapter-content',  // Another common selector
            '#nr1'               // Added selector for article content
        ];

        const titleSelectors = [
            '#nr_title',         // Added selector for article title
            'h1.article-title'   // Another common selector for titles
        ];

        let novelContentElement = null;
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                novelContentElement = element;
                break;
            }
        }

        let articleTitleElement = null;
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                articleTitleElement = element;
                break;
            }
        }

        return {
            content: novelContentElement,
            title: articleTitleElement
        };
    }

    // Function to find and click the "Next Chapter" button.
    // It searches for a list of possible next button texts.
    function findAndClickNextButton() {
        const nextButtonTexts = [
            '下一页', // New, higher priority
            '下一章'  // Original
        ];
        const allLinks = document.querySelectorAll('a');

        for (const textToFind of nextButtonTexts) {
            for (const link of allLinks) {
                // Check if the link's text content matches exactly
                if (link.textContent.trim() === textToFind) {
                    link.click(); // Click the link
                    return true;  // Indicate that the button was found and clicked
                }
            }
        }

        return false; // Indicate that no matching button was found
    }

    // Function to handle the sequence of actions after a successful copy.
    function handleSuccessfulCopy() {
        showCopyFeedback('Content copied!');

        // Wait a very short moment so the user sees the "Copied!" feedback
        // before the page potentially navigates away.
        setTimeout(() => {
            const wasNextButtonClicked = findAndClickNextButton();

            // If the next button wasn't found, inform the user.
            if (!wasNextButtonClicked) {
                // Use another short delay so this message doesn't overwrite the first one instantly.
                setTimeout(() => {
                    showCopyFeedback('Next button not found.');
                }, 300);
            }
        }, 150); // 150ms delay
    }

    // Function to check if we're on a page with novel content
    function checkForNovelContent() {
        // --- START OF 69shuba.com MODIFICATION ---
        if (window.location.hostname.includes('69shuba.com')) {
            // On 69shuba, the main container is '.txtnav' and a title always exists within it.
            return document.querySelector('.txtnav > h1.hide720') !== null;
        }
        // --- END OF 69shuba.com MODIFICATION ---

        const elements = getNovelContentAndTitleElements();
        // Consider content present if either the main content or the title is found
        return elements.content !== null || elements.title !== null;
    }

    // Only proceed if we detect novel content
    if (!checkForNovelContent()) {
        // Check again after a delay in case content loads dynamically
        setTimeout(() => {
            if (checkForNovelContent()) {
                initCopyButton();
            }
        }, 2000);
    } else {
        initCopyButton();
    }

    function initCopyButton() {
        // Create and add the copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy & Next'; // Updated button text for clarity
        copyButton.style.position = 'fixed';
        copyButton.style.bottom = '20px';
        copyButton.style.right = '20px';
        copyButton.style.padding = '10px 15px';
        copyButton.style.backgroundColor = '#4CAF50';
        copyButton.style.color = 'white';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '5px';
        copyButton.style.fontSize = '16px';
        copyButton.style.zIndex = '9999';
        copyButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        document.body.appendChild(copyButton);

        // Keep the keyboard shortcut for desktop
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.keyCode === 67) { // Ctrl+C
                e.preventDefault();
                copyNovelContent();
            }
        });

        // Add click event listener to the button
        copyButton.addEventListener('click', copyNovelContent);
    }

    function copyNovelContent() {
        // --- START OF 69shuba.com MODIFICATION ---
        if (window.location.hostname.includes('69shuba.com')) {
            const articleTitleElement = document.querySelector('.txtnav > h1.hide720');
            const novelContentContainer = document.querySelector('.txtnav');
            let formattedText = '';

            if (!novelContentContainer) {
                showCopyFeedback('Content container (.txtnav) not found.');
                return;
            }

            if (articleTitleElement) {
                formattedText += articleTitleElement.textContent.trim() + '\n\n';
            }

            // Clone the container to manipulate it without affecting the page
            const contentClone = novelContentContainer.cloneNode(true);

            // Remove all known non-content elements (title, info, ads, scripts)
            contentClone.querySelectorAll('h1, .txtinfo, #txtright, .contentadv, .bottom-ad, script').forEach(el => el.remove());

            // Get the innerText from the cleaned clone
            let contentText = contentClone.innerText;

            // Find the end marker (e.g., "(本章完)") and truncate the text
            const endMarker = '(本章完)';
            const endMarkerIndex = contentText.indexOf(endMarker);
            if (endMarkerIndex !== -1) {
                contentText = contentText.substring(0, endMarkerIndex);
            }

            // Clean up excessive whitespace and combine with title
            formattedText += contentText.trim();

            // Use the script's existing copy-to-clipboard logic
            if (typeof GM !== 'undefined' && GM.setClipboard) {
                GM.setClipboard(formattedText)
                    .then(handleSuccessfulCopy)
                    .catch(err => fallbackCopy(formattedText));
            } else if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(formattedText);
                handleSuccessfulCopy();
            } else {
                fallbackCopy(formattedText);
            }

            return; // IMPORTANT: Prevent the original generic logic from running
        }
        // --- END OF 69shuba.com MODIFICATION ---


        const { content: novelContent, title: articleTitle } = getNovelContentAndTitleElements();
        let formattedText = '';

        if (articleTitle) {
            formattedText += articleTitle.textContent.trim() + '\n\n';
        }

        if (novelContent) {
            // Get all child nodes of the novel content
            const allContentNodes = Array.from(novelContent.childNodes);
            let stopCopying = false;

            allContentNodes.forEach(node => {
                if (stopCopying) {
                    return; // Skip further nodes if stop condition is met
                }

                // Check for the specific div with class 'pagination2'
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('pagination2')) {
                    stopCopying = true; // Set flag to stop processing further nodes
                    return;
                }

                // Only process paragraph elements for content
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
                    let text = node.textContent
                        .replace(/\s+/g, ' ') // Collapse multiple whitespace
                        .trim();

                    // Add paragraph spacing only between non-empty paragraphs
                    if (text) {
                        formattedText += `${text}\n\n`;
                    }
                }
            });
        }
        // Clean up extra newlines at the end
        formattedText = formattedText.trim();

        // Try to use Tampermonkey's clipboard API first
        if (typeof GM !== 'undefined' && GM.setClipboard) {
            GM.setClipboard(formattedText)
                .then(handleSuccessfulCopy)
                .catch(err => fallbackCopy(formattedText));
        }
        // Try older Tampermonkey API
        else if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(formattedText);
            handleSuccessfulCopy();
        }
        // Fall back to browser methods
        else {
            fallbackCopy(formattedText);
        }
    }

    function fallbackCopy(text) {
        // For mobile support, use a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            // Try the modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(handleSuccessfulCopy)
                    .catch(err => {
                        // Fall back to document.execCommand
                        const successful = document.execCommand('copy');
                        if (successful) {
                            handleSuccessfulCopy();
                        } else {
                            showCopyFeedback('Copy failed. Please try again.');
                        }
                    });
            } else {
                // Fall back to document.execCommand for older browsers
                const successful = document.execCommand('copy');
                if (successful) {
                    handleSuccessfulCopy();
                } else {
                    showCopyFeedback('Copy failed. Please try again.');
                }
            }
        } catch (err) {
            showCopyFeedback('Copy failed: ' + err);
        }

        // Clean up
        document.body.removeChild(textarea);
    }

    // Function to show feedback to the user
    function showCopyFeedback(message) {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.position = 'fixed';
        feedback.style.bottom = '70px';
        feedback.style.right = '20px';
        feedback.style.padding = '10px';
        feedback.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        feedback.style.color = 'white';
        feedback.style.borderRadius = '5px';
        feedback.style.zIndex = '10000';
        document.body.appendChild(feedback);

        // Remove the feedback after 2 seconds
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 2000);
    }
})();
