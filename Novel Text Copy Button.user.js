// ==UserScript==
// @name         Novel Text Copy Button
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Adds a copy button to easily copy novel text and clicks the next chapter button, supporting multiple next button texts, and ignoring specific footer content. Includes site-locked support for tongrenxsw.com and 69shuba.com.
// @author       You (with modifications)
// @match        *://**/*
// @grant        GM.setClipboard
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    function isTongrenXsw() {
        return /(^|\.)tongrenxsw\.com$/i.test(window.location.hostname);
    }

    // Tongren: dedicated selectors (ONLY active on tongrenxsw.com)
    function getTongrenElements() {
        const titleEl = document.querySelector('h1.title');
        const contentEl = document.querySelector('div.content');
        if (!titleEl || !contentEl) return null;
        return { titleEl, contentEl };
    }

    // Function to find the novel content container and title using a list of possible selectors.
    // NOTE: h1.title + div.content are NOT included here to avoid false matches on other sites.
    function getNovelContentAndTitleElements() {
        // --- START OF tongrenxsw.com MODIFICATION (locked) ---
        if (isTongrenXsw()) {
            const tr = getTongrenElements();
            if (tr) {
                return { content: tr.contentEl, title: tr.titleEl, mode: 'TONGREN' };
            }
            // If tongren but elements not found, fall through to generic (in case of variant pages)
        }
        // --- END OF tongrenxsw.com MODIFICATION (locked) ---

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
            title: articleTitleElement,
            mode: 'GENERIC'
        };
    }

    // Function to find and click the "Next Chapter" button.
    // Tongren: click ONLY inside .btnW with exact text 下一章
    // Others: fallback to generic scan for 下一页/下一章
    function findAndClickNextButton() {
        // --- START OF tongrenxsw.com MODIFICATION (locked) ---
        if (isTongrenXsw()) {
            const btnWrap = document.querySelector('.btnW');
            if (btnWrap) {
                const links = btnWrap.querySelectorAll('a');
                for (const link of links) {
                    if (link.textContent.trim() === '下一章') {
                        link.click();
                        return true;
                    }
                }
            }
            return false;
        }
        // --- END OF tongrenxsw.com MODIFICATION (locked) ---

        const nextButtonTexts = [
            '下一页',
            '下一章'
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
        // --- START OF 69shuba.com MODIFICATION ---
        if (window.location.hostname.includes('69shuba.com')) {
            return document.querySelector('.txtnav > h1.hide720') !== null;
        }
        // --- END OF 69shuba.com MODIFICATION ---

        // --- START OF tongrenxsw.com MODIFICATION (locked) ---
        if (isTongrenXsw()) {
            const tr = getTongrenElements();
            return tr !== null;
        }
        // --- END OF tongrenxsw.com MODIFICATION (locked) ---

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
        // Prevent duplicate injection on sites with dynamic navigation
        if (document.getElementById('tm-copy-next-btn')) return;

        const copyButton = document.createElement('button');
        copyButton.id = 'tm-copy-next-btn';
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
            if (e.ctrlKey && e.keyCode === 67) {
                e.preventDefault();
                copyNovelContent();
            }
        });

        copyButton.addEventListener('click', copyNovelContent);
    }

    function copyNovelContent() {
        // --- START OF 69shuba.com MODIFICATION ---
        if (window.location.hostname.includes('69shuba.com')) {
            const novelContentContainer = document.querySelector('.txtnav');
            let formattedText = '';

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

            formattedText = contentText.trim();

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

            return;
        }
        // --- END OF 69shuba.com MODIFICATION ---


        // --- START OF tongrenxsw.com MODIFICATION (locked) ---
        if (isTongrenXsw()) {
            const tr = getTongrenElements();
            if (!tr) {
                showCopyFeedback('Tongren elements (h1.title / div.content) not found.');
                return;
            }

            const titleText = (tr.titleEl.textContent || '').replace(/\s+/g, ' ').trim();

            // Clone content to clean without touching the page
            const clone = tr.contentEl.cloneNode(true);

            // Remove ads/junk
            clone.querySelectorAll('#ad-container, script, style, i.icon').forEach(el => el.remove());

            // Remove everything before first <p> (kills the domain spam lines like jianpanxsw.com etc.)
            const firstP = clone.querySelector('p');
            if (firstP) {
                const nodes = Array.from(clone.childNodes);
                const idx = nodes.indexOf(firstP);
                if (idx > 0) {
                    for (let i = 0; i < idx; i++) {
                        if (nodes[i] && nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
                    }
                }
            }

            // Prefer paragraph extraction for cleaner spacing
            const ps = Array.from(clone.querySelectorAll('p'));
            let body = '';
            if (ps.length) {
                body = ps
                    .map(p => (p.innerText || '').trim())
                    .filter(Boolean)
                    .join('\n\n')
                    .trim();
            } else {
                body = (clone.innerText || '').trim();
            }

            const formattedText = (titleText ? titleText + '\n\n' : '') + body;

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

            return;
        }
        // --- END OF tongrenxsw.com MODIFICATION (locked) ---


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

                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
                    let text = node.textContent
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (text) {
                        formattedText += `${text}\n\n`;
                    }
                }
            });
        }

        formattedText = formattedText.trim();

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
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(handleSuccessfulCopy)
                    .catch(err => {
                        const successful = document.execCommand('copy');
                        if (successful) {
                            handleSuccessfulCopy();
                        } else {
                            showCopyFeedback('Copy failed. Please try again.');
                        }
                    });
            } else {
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
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 2000);
    }
})();
