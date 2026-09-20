// Supported hosts for this extension.
const SUPPORTED_HOSTS = [
  "chatgpt.com",
  "chat.deepseek.com",
  "chat.z.ai",
  "chat.qwen.ai",
  "grok.com",
  "localhost",
  "127.0.0.1"
];

function checkURL(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return SUPPORTED_HOSTS.some(
      (h) => u.hostname === h || u.hostname.endsWith("." + h)
    );
  } catch (e) {
    return false;
  }
}

// Update the UI based on the button state
const updateUI = (buttonOn) => {
  const eye = document.querySelector(".eye");
  const button = document.querySelector(".button");
  const circle = document.querySelector(".circle");
  if (!button || !circle || !eye) return;

  if (buttonOn) {
    eye.innerHTML = "📡";
    button.style.animation = "transformToBlue 0.5s ease-in-out 0s forwards";
    circle.style.animation = "moveCircleRight 0.5s ease-in-out 0s forwards";
  } else {
    eye.innerHTML = "🤖";
    button.style.animation = "transformToYellow 0.5s ease-in-out 0s forwards";
    circle.style.animation = "moveCircleLeft 0.5s ease-in-out 0s forwards";
  }
};

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const injectFile = (file) =>
  getCurrentTab().then((tab) => {
    if (!tab || !tab.id) return;
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: [file] })
      .catch(() => {});
  });

const callAddStyle = () => injectFile("assets/script/addContent.js");
const removeScript = () => injectFile("assets/script/removeContent.js");

// Restore UI + apply/remove styles from stored state on popup open
const initPopup = () => {
  chrome.storage.local.get(["buttonOn"], (result) => {
    const buttonOn = result.buttonOn === true;
    updateUI(buttonOn);
    if (buttonOn) callAddStyle();
    else removeScript();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentURL = tabs && tabs[0] ? tabs[0].url : "";

    if (!checkURL(currentURL)) {
      const message = document.createElement("p");
      message.innerHTML =
        'This extension only works on <a href="https://chatgpt.com/" target="_blank">chatgpt.com</a>, ' +
        '<a href="https://chat.deepseek.com/" target="_blank">chat.deepseek.com</a>, ' +
        '<a href="https://chat.z.ai/" target="_blank">chat.z.ai</a>, ' +
        '<a href="https://chat.qwen.ai/" target="_blank">chat.qwen.ai</a>, ' +
        '<a href="https://grok.com/" target="_blank">grok.com</a>, ' +
        "and local DeepSeek Harness (localhost / 127.0.0.1).";

      const alertBox = document.querySelector(".messageAlert");
      if (alertBox) alertBox.appendChild(message);

      const button = document.querySelector(".button");
      if (button) button.style.display = "none";
      return;
    }

    initPopup();
  });

  const button = document.querySelector(".button");
  if (!button) return;

  button.addEventListener("click", () => {
    chrome.storage.local.get(["buttonOn"], (result) => {
      const newButtonState = result.buttonOn !== true;
      chrome.storage.local.set({ buttonOn: newButtonState }, () => {
        updateUI(newButtonState);
        if (newButtonState) callAddStyle();
        else removeScript();
      });
    });
  });
});