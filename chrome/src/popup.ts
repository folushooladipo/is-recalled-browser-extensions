/* eslint-disable @typescript-eslint/no-non-null-assertion */
"use strict";

// This code is partially adapted from the openai-chatgpt-chrome-extension repo:
// https://github.com/jessedi0n/openai-chatgpt-chrome-extension

import "./popup.css";

import {
  MLCEngineInterface,
  InitProgressReport,
  CreateMLCEngine,
  ChatCompletionMessageParam,
  prebuiltAppConfig,
} from "@mlc-ai/web-llm";
import { Line } from "progressbar.js";

function setLabel(id: string, text: string) {
  const label = document.getElementById(id);
  if (label != null) {
    label.innerText = text;
  }
}

function getElementAndCheck(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw Error("Cannot find element " + id);
  }

  return element;
}

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const queryInput = getElementAndCheck("query-input");
const submitButton = getElementAndCheck("submit-button") as HTMLButtonElement;
const modelName = getElementAndCheck("model-name");

let context = "";
let modelDisplayName = "";

// Throws a runtime.lastError if you reload this extension AND try to access a browser tab that is already open. So just refresh existing tabs after reloading this extension.
fetchPageContents();

submitButton.disabled = true;

let progressBar = new Line("#loadingContainer", {
  strokeWidth: 4,
  easing: "easeInOut",
  duration: 1400,
  color: "#ffd166",
  trailColor: "#eee",
  trailWidth: 5,
  svgStyle: { width: "100%", height: "100%" },
});

let isLoadingParams = true;

let initProgressCallback = (report: InitProgressReport) => {
  setLabel("init-label", report.text);
  progressBar.animate(report.progress, {
    duration: 50,
  });
  if (report.progress === 1.0) {
    enableInputs();
  }
};

// initially selected model
let selectedModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

// populate model-selection
const modelSelector = getElementAndCheck(
  "model-selection"
) as HTMLSelectElement;
for (let i = 0; i < prebuiltAppConfig.model_list.length; ++i) {
  const model = prebuiltAppConfig.model_list[i];
  const opt = document.createElement("option");
  opt.value = model.model_id;
  opt.innerHTML = model.model_id;
  opt.selected = false;

  // set initial selection as the initially selected model
  if (model.model_id === selectedModel) {
    opt.selected = true;
  }

  modelSelector.appendChild(opt);
}

modelName.innerText = "Loading initial model...";
const engine: MLCEngineInterface = await CreateMLCEngine(selectedModel, {
  initProgressCallback: initProgressCallback,
});
modelName.innerText = "Now chatting with " + modelDisplayName;

let chatHistory: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: `You are a web page analyzer. Analyze the page content and return a JSON object with:
1. pageType: \"PRODUCT_LIST\", \"PRODUCT_DETAIL\", or \"OTHER\"

Return ONLY valid JSON, no markdown formatting.`,
  },
];

function enableInputs() {
  if (isLoadingParams) {
    sleep(500);
    isLoadingParams = false;
  }

  // remove loading bar and loading bar descriptors, if exists
  const initLabel = document.getElementById("init-label");
  initLabel?.remove();
  const loadingBarContainer = document.getElementById("loadingContainer")!;
  loadingBarContainer?.remove();
  queryInput.focus();

  const modelNameArray = selectedModel.split("-");
  modelDisplayName = modelNameArray[0];
  let j = 1;
  while (j < modelNameArray.length && modelNameArray[j][0] != "q") {
    modelDisplayName = modelDisplayName + "-" + modelNameArray[j];
    j++;
  }
}

let requestInProgress = false;

// Disable submit button if input field is empty
queryInput.addEventListener("keyup", () => {
  if (
    (<HTMLInputElement>queryInput).value === "" ||
    requestInProgress ||
    isLoadingParams
  ) {
    submitButton.disabled = true;
  } else {
    submitButton.disabled = false;
  }
});

// If user presses enter, click submit button
queryInput.addEventListener("keyup", (event) => {
  if (event.code === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitButton.click();
  }
});

// Listen for clicks on submit button
async function handleClick() {
  requestInProgress = true;
  submitButton.disabled = true;

  // Get the message from the input field
  const message = (<HTMLInputElement>queryInput).value;
  console.log("message", message);
  // Clear the answer
  document.getElementById("answer")!.innerHTML = "";
  // Hide the answer
  document.getElementById("answerWrapper")!.style.display = "none";
  // Show the loading indicator
  document.getElementById("loading-indicator")!.style.display = "block";

  // Generate response
  let inp = message;
  if (context.length > 0) {
    inp =
      "Use only the following context when answering the question at the end. Don't use any other knowledge.\n" +
      context +
      "\n\nQuestion: " +
      message +
      "\n\nHelpful Answer: ";
  }
  console.log("Input:", inp);
  chatHistory.push({ role: "user", content: inp });

  let curMessage = "";
  const completion = await engine.chat.completions.create({
    stream: true,
    messages: chatHistory,
  });
  for await (const chunk of completion) {
    const curDelta = chunk.choices[0].delta.content;
    if (curDelta) {
      curMessage += curDelta;
    }
    updateAnswer(curMessage);
  }
  const response = await engine.getMessage();
  chatHistory.push({ role: "assistant", content: response });
  console.log("response", response);

  requestInProgress = false;
  submitButton.disabled = false;
}
submitButton.addEventListener("click", handleClick);

// listen for changes in modelSelector
async function handleSelectChange() {
  if (isLoadingParams) {
    return;
  }

  modelName.innerText = "";

  const initLabel = document.createElement("p");
  initLabel.id = "init-label";
  initLabel.innerText = "Initializing model...";
  const loadingContainer = document.createElement("div");
  loadingContainer.id = "loadingContainer";

  const loadingBox = getElementAndCheck("loadingBox");
  loadingBox.appendChild(initLabel);
  loadingBox.appendChild(loadingContainer);

  isLoadingParams = true;
  submitButton.disabled = true;

  if (requestInProgress) {
    engine.interruptGenerate();
  }
  engine.resetChat();
  chatHistory = [];
  await engine.unload();

  selectedModel = modelSelector.value;

  progressBar = new Line("#loadingContainer", {
    strokeWidth: 4,
    easing: "easeInOut",
    duration: 1400,
    color: "#ffd166",
    trailColor: "#eee",
    trailWidth: 5,
    svgStyle: { width: "100%", height: "100%" },
  });

  initProgressCallback = (report: InitProgressReport) => {
    setLabel("init-label", report.text);
    progressBar.animate(report.progress, {
      duration: 50,
    });
    if (report.progress === 1.0) {
      enableInputs();
    }
  };

  engine.setInitProgressCallback(initProgressCallback);

  requestInProgress = true;
  modelName.innerText = "Reloading with new model...";
  await engine.reload(selectedModel);
  requestInProgress = false;
  modelName.innerText = "Now chatting with " + modelDisplayName;
}
modelSelector.addEventListener("change", handleSelectChange);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(({ answer, error }) => {
  if (answer) {
    updateAnswer(answer);
  }
});

function updateAnswer(answer: string) {
  // Show answer
  document.getElementById("answerWrapper")!.style.display = "block";
  const answerWithBreaks = answer.replace(/\n/g, "<br>");
  document.getElementById("answer")!.innerHTML = answerWithBreaks;
  // Add event listener to copy button
  document.getElementById("copyAnswer")!.addEventListener("click", () => {
    // Get the answer text
    const answerText = answer;
    // Copy the answer text to the clipboard
    navigator.clipboard
      .writeText(answerText)
      .then(() => console.log("Answer text copied to clipboard"))
      .catch((err) => console.error("Could not copy text: ", err));
  });
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  const time = new Date().toLocaleString("en-US", options);
  // Update timestamp
  document.getElementById("timestamp")!.innerText = time;
  // Hide loading indicator
  document.getElementById("loading-indicator")!.style.display = "none";
}

function fetchPageContents() {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    if (tabs[0].id) {
      const tabId = tabs[0].id;

      // Request cleaned content from service worker
      chrome.runtime.sendMessage(
        { action: "getCleanedContent", tabId: tabId },
        (response) => {
          if (response && response.success && response.cleanedContent) {
            console.log("Cleaned page contents retrieved from service worker");
            // context = response.cleanedContent;
          } else {
            // Fallback: use port connection to trigger content script
            const port = chrome.tabs.connect(tabId, { name: "channelName" });
            port.postMessage({});
            port.onMessage.addListener(function (msg) {
              console.log("Page contents:", msg.contents);
              // context = msg.contents;
            });
          }
        }
      );
    }
  });
}
