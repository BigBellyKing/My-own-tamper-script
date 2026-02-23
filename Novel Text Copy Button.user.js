// ==UserScript==
// @name         Novel Text Copy Button
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Adds a copy button to easily copy novel text and clicks the next chapter button. Optimized for tongrenxsw.com class selectors.
// @author       You (with modifications)
// @match        *://www.tongrenxsw.com/*
// @match        *://tongrenxsw.com/*
// @match        *://**/*
// @grant        GM.setClipboard
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // Function to find the novel content container and title
    function getNovelContentAndTitleElements() {
        const contentSelectors = [
            '.content',          // Specific class for tongrenxsw
            '#content',          // ID variant
            '#novel_content',
            '.chapter-content'
        ];

        const titleSelectors = [
            'h1.title',          // Standard title
            'h3.font24',         // Title found in your HTML snippet
            '.tit.pcs .cur',     // Breadcrumb title
            '#nr_title'
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

    function findAndClickNextButton() {
        const nextButtonTexts = ['下一页', '下一章', 'Next Chapter'];
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
            if (!findAndClickNextButton()) {
                setTimeout(() => showCopyFeedback('Next button not found.'), 300);
            }
        }, 150);
    }

    // UPDATED: More robust check for content
    function checkForNovelContent() {
        if (window.location.hostname.includes('tongrenxsw.com')) {
            // Check for the .content class specifically
            return document.querySelector('.content') !== null || document.querySelector('#content') !== null;
        }
        if (window.location.hostname.includes('69shuba.com')) {
            return document.querySelector('.txtnav') !== null;
        }
        const elements = getNovelContentAndTitleElements();
        return elements.content !== null;
    }

    // Initialize logic
    function tryInit() {
        if (checkForNovelContent()) {
            initCopyButton();
        } else {
            // Try again every second for 5 seconds (handles slow loading)
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (checkForNovelContent()) {
                    initCopyButton();
                    clearInterval(interval);
                } else if (attempts > 5) {
                    clearInterval(interval);
                }
            }, 1000);
        }
    }

    tryInit();

    function initCopyButton() {
        if (document.getElementById('novel-copy-btn')) return; // Prevent duplicates

        const copyButton = document.createElement('button');
        copyButton.id = 'novel-copy-btn';
        copyButton.textContent = 'Copy & Next';
        copyButton.style.cssText = 'position:fixed; bottom:20px; right:20px; padding:10px 15px; background-color:#4CAF50; color:white; border:none; border-radius:5px; font-size:16px; z-index:9999; box-shadow:0 2px 5px rgba(0,0,0,0.3); cursor:pointer;';
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
            const els = getNovelContentAndTitleElements();
            let formattedText = '';

            if (els.title) formattedText += els.title.innerText.trim() + '\n\n';
            
            if (els.content) {
                const clone = els.content.cloneNode(true);
                // Remove buttons or scripts inside the content
                clone.querySelectorAll('script, style, .btnW, .btnBlack, .btnBlack2').forEach(el => el.remove());
                formattedText += clone.innerText.trim();
            }

            if (formattedText.trim().length > 10) {
                GM_setClipboard(formattedText.trim());
                handleSuccessfulCopy();
                return;
            }
        }

        // --- 69shuba logic ---
        if (window.location.hostname.includes('69shuba.com')) {
            const container = document.querySelector('.txtnav');
            if (container) {
                const clone = container.cloneNode(true);
                clone.querySelectorAll('h1, .txtinfo, #txtright, .contentadv, .bottom-ad, script').forEach(el => el.remove());
                let text = clone.innerText.split('(本章完)')[0].trim();
                GM_setClipboard(text);
                handleSuccessfulCopy();
                return;
            }
        }

        // --- GENERIC LOGIC ---
        const { content: novelContent, title: articleTitle } = getNovelContentAndTitleElements();
        let formattedText = '';

        if (articleTitle) formattedText += articleTitle.textContent.trim() + '\n\n';
        if (novelContent) {
            formattedText += novelContent.innerText.trim();
        }

        if (formattedText.trim()) {
            GM_setClipboard(formattedText.trim());
            handleSuccessfulCopy();
        }
    }

    function showCopyFeedback(message) {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = 'position:fixed; bottom:70px; right:20px; padding:10px; background-color:rgba(0,0,0,0.7); color:white; border-radius:5px; z-index:10000;';
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }
})();
