// ==UserScript==
// @name         Novel Text Copy Button
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds a copy button to easily copy novel text and clicks the next chapter button.
// @author       You (with modifications)
// @match        *://**/*
// @grant        GM.setClipboard
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // Function to find the novel content container using a list of possible selectors.
    function getNovelContentElement() {
        const selectors = [
            '#novel_content',    // The original selector
            '.chapter-content'   // Another common selector
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element; // Return the first element that is found
            }
        }

        return null; // Return null if no matching element is found
    }

    // --- MODIFICATION START ---
    // New function to find and click the "Next Chapter" button.
    // It searches for a link with the specific text you provided.
    function findAndClickNextButton() {
        const nextButtonText = '下一章';
        const allLinks = document.querySelectorAll('a');

        for (const link of allLinks) {
            // Check if the link's text content matches exactly
            if (link.textContent.trim() === nextButtonText) {
                link.click(); // Click the link
                return true;  // Indicate that the button was found and clicked
            }
        }

        return false; // Indicate that the button was not found
    }

    // New function to handle the sequence of actions after a successful copy.
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
    // --- MODIFICATION END ---


    // Function to check if we're on a page with novel content
    function checkForNovelContent() {
        return getNovelContentElement() !== null;
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
        const novelContent = getNovelContentElement();
        if (novelContent) {
            // Get all paragraphs and process them individually
            const paragraphs = Array.from(novelContent.querySelectorAll('p'));
            let formattedText = '';

            paragraphs.forEach(p => {
                let text = p.textContent
                    .replace(/\s+/g, ' ') // Collapse multiple whitespace
                    .trim();

                // Add paragraph spacing only between non-empty paragraphs
                if (text) {
                    formattedText += `${text}\n\n`;
                }
            });
            // Clean up extra newlines at the end
            formattedText = formattedText.trim();

            // Try to use Tampermonkey's clipboard API first
            // --- MODIFIED --- to use the new success handler
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
            // --- MODIFIED --- to use the new success handler
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