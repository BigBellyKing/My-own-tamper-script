// ==UserScript==
// @name         Novel Text Copy Button
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Adds a copy button to easily copy novel text and clicks the next chapter button. Added support for tongrenxsw.com.
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
            '#content',          // Specific for tongrenxsw
            '#novel_content',    // Original
            '.chapter-content',  // Common
            '#nr1'               // Generic
        ];

        const titleSelectors = [
            'h1.title',          // Specific for tongrenxsw
            '#nr_title',         // Added selector for article title
            'h1.article-title',  // Common
            '.tit.pcs .cur'      // Breadcrumb title for some sites
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
    function findAndClickNextButton() {
        const nextButtonTexts = [
            '下一页',
            '下一章',
            'Next Chapter'
        ];
        const allLinks = document.querySelectorAll('a');

        for (const textToFind of nextButtonTexts) {
            for (const link of allLinks) {
                if (link.textContent.trim() === textToFind) {
                    link.click();
                    return true;
                }
            }
        }

        return false;
    }

    function handleSuccessfulCopy() {
        showCopyFeedback('Content copied!');
        setTimeout(() => {
            const wasNextButtonClicked = findAndClickNextButton();
            if (!wasNextButtonClicked) {
                setTimeout(() => {
                    showCopyFeedback('Next button not found.');
                }, 300);
            }
        }, 150);
    }

    function checkForNovelContent() {
        // --- START OF TONGRENXSW.COM SUPPORT ---
        if (window.location.hostname.includes('tongrenxsw.com')) {
            return document.querySelector('#content') !== null;
        }
        // --- END OF TONGRENXSW.COM SUPPORT ---

        if (window.location.hostname.includes('69shuba.com')) {
            return document.querySelector('.txtnav > h1.hide720') !== null;
        }

        const elements = getNovelContentAndTitleElements();
        return elements.content !== null || elements.title !== null;
    }

    if (!checkForNovelContent()) {
        setTimeout(() => {
            if (checkForNovelContent()) {
                initCopyButton();
            }
        }, 2000);
    } else {
        initCopyButton();
    }

    function initCopyButton() {
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy & Next';
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

        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.keyCode === 67) { // Ctrl+C
                e.preventDefault();
                copyNovelContent();
            }
        });

        copyButton.addEventListener('click', copyNovelContent);
    }

    function copyNovelContent() {
        // --- TONGRENXSW.COM SPECIFIC LOGIC ---
        if (window.location.hostname.includes('tongrenxsw.com')) {
            const titleEl = document.querySelector('h1.title') || document.querySelector('.tit.pcs .cur');
            const contentEl = document.querySelector('#content');
            let formattedText = '';

            if (titleEl) formattedText += titleEl.innerText.trim() + '\n\n';
            if (contentEl) {
                // Clone to clean up ads or unwanted elements if they exist
                const clone = contentEl.cloneNode(true);
                clone.querySelectorAll('script, style, div').forEach(el => el.remove());
                formattedText += clone.innerText.trim();
            }

            if (formattedText) {
                GM_setClipboard(formattedText.trim());
                handleSuccessfulCopy();
                return;
            }
        }

        // --- 69shuba.com MODIFICATION ---
        if (window.location.hostname.includes('69shuba.com')) {
            const novelContentContainer = document.querySelector('.txtnav');
            if (!novelContentContainer) {
                showCopyFeedback('Content container (.txtnav) not found.');
                return;
            }
            const contentClone = novelContentContainer.cloneNode(true);
            contentClone.querySelectorAll('h1, .txtinfo, #txtright, .contentadv, .bottom-ad, script').forEach(el => el.remove());
            let contentText = contentClone.innerText;
            const endMarker = '(本章完)';
            const endMarkerIndex = contentText.indexOf(endMarker);
            if (endMarkerIndex !== -1) {
                contentText = contentText.substring(0, endMarkerIndex);
            }
            let formattedText = contentText.trim();

            GM_setClipboard(formattedText);
            handleSuccessfulCopy();
            return;
        }

        // --- GENERIC LOGIC ---
        const { content: novelContent, title: articleTitle } = getNovelContentAndTitleElements();
        let formattedText = '';

        if (articleTitle) {
            formattedText += articleTitle.textContent.trim() + '\n\n';
        }

        if (novelContent) {
            const allContentNodes = Array.from(novelContent.childNodes);
            let stopCopying = false;
            allContentNodes.forEach(node => {
                if (stopCopying) return;
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('pagination2')) {
                    stopCopying = true;
                    return;
                }
                if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'P' || node.tagName === 'DIV')) {
                    let text = node.textContent.replace(/\s+/g, ' ').trim();
                    if (text) formattedText += `${text}\n\n`;
                } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    formattedText += node.textContent.trim() + '\n\n';
                }
            });
        }

        formattedText = formattedText.trim();

        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(formattedText);
            handleSuccessfulCopy();
        } else {
            fallbackCopy(formattedText);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) handleSuccessfulCopy();
            else showCopyFeedback('Copy failed.');
        } catch (err) {
            showCopyFeedback('Copy failed: ' + err);
        }
        document.body.removeChild(textarea);
    }

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
        setTimeout(() => {
            if (document.body.contains(feedback)) document.body.removeChild(feedback);
        }, 2000);
    }
})();
