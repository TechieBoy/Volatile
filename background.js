// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const DB_NAME = "images"
const USERNAME = "USERNAME"
const MODEL_URL = "/weights";
let not = "Watching You";
let not_options = { type: "image", title: "Alert!", message: "Someone is watching You!", iconUrl: "monkas.png", imageUrl: "monkas.png", priority: 2 };
const EUCLID_MAX_DISTANCE = 0.6;
// TODO Fill all classes of images possible to recognize
let classes = [USERNAME];
const use_model = "yolo"; // 'ssd', 'mtcnn' 

// Yolo Parameters
const yoloUseBatchProcessing = false;
const yoloParams = {
    inputSize: "lg",
    scoreThreshold: 0.2
}

// mtcnn parameters
const mtcnnParams = {
    minFaceSize: 200
}

// SSD parameters
const ssd_min_confidence = 0.3;

let trainDescriptorsByClass = [];

chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.sync.set({ color: '#3aa757' }, function () {
        console.log('The color is green.');
    });
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {
                    ports: [[80, 9000]]
                },
            })],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});
let lastTabIds = [];
chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        if (request.verify != undefined) {

            // Verify user face and then upload documents
            console.log(sender.tab.id);
            lastTabIds.push(sender.tab.id);
            chrome.tabs.create({
                url: chrome.extension.getURL('identify.html'),
                active: true,
            }, function (tab) {
                chrome.windows.create({
                    tabId: tab.id,
                    type: 'popup',
                    top: Math.round(0.05 * request.h),
                    left: Math.round(1.0 * request.w),
                    height: Math.round(0.35 * request.h),
                    width: Math.round(0.58 * request.w),
                    focused: true
                });
            });
        }
    });

chrome.runtime.onMessage.addListener(
    async function (request, sender, sendResponse) {


        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.verified != undefined) {
            console.log(lastTabIds);
            let tabi = lastTabIds.pop();
            let data = { frombg: true };
            Object.assign(data, request.data);
            chrome.tabs.sendMessage(tabi, data);
        }
        if (request.suicide == true) {
            // main();
            chrome.tabs.remove(sender.tab.id);
        }

    });

function sendOrder(order) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { order: order });
    });
}


async function load_models() {
    const MODEL_URL = "/weights";
    await faceapi.loadFaceRecognitionModel(MODEL_URL);
    switch (use_model) {
        case "yolo":
            await faceapi.loadTinyYolov2Model(MODEL_URL);
            // For full landmark
            await faceapi.loadFaceLandmarkModel(MODEL_URL);
            // For tiny landmark
            // await faceapi.loadFaceLandmarkTinyModel(MODEL_URL)
            break;
        case "mtcnn":
            await faceapi.loadMtcnnModel(MODEL_URL);
            break;
        case "ssd":
            await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
            // For full landmark
            await faceapi.loadFaceLandmarkModel(MODEL_URL);
            // For tiny landmark
            // await faceapi.loadFaceLandmarkTinyModel(MODEL_URL)
            break;
    }
}


async function doesMatch(inputEl) {
    const { width, height } = inputEl;
    let fullFaceDescriptions;
    switch (use_model) {
        case "yolo":
            fullFaceDescriptions = (await faceapi.allFacesTinyYolov2(inputEl, yoloParams, yoloUseBatchProcessing))
                .map(fd => fd.forSize(width, height));
            break;
        case "mtcnn":
            fullFaceDescriptions = (await faceapi.allFacesMtcnn(inputEl, mtcnnParams))
                .map(fd => fd.forSize(width, height));
            break;
        case "ssd":
            fullFaceDescriptions = (await faceapi.allFacesSsdMobilenetv1(inputEl, ssd_min_confidence))
                .map(fd => fd.forSize(width, height));
            break;

    }

    if (!Array.isArray(fullFaceDescriptions) || !fullFaceDescriptions.length) {
        // TODO no Face found in image
        sendOrder("blank_screen");
        console.log("No face in image");
        return false;
    }

    let num_faces = fullFaceDescriptions.length;

    for (let descripton of fullFaceDescriptions) {
        const { detection, landmarks, descriptor } = descripton;
        const bestMatch = getBestMatch(trainDescriptorsByClass, descriptor);
        if (bestMatch.distance < EUCLID_MAX_DISTANCE) {

            console.log("Found Match of " + bestMatch.className + " " + ((1 - bestMatch.distance) * 100).toFixed(2) + "%.");
            if (num_faces > 1) {
                sendOrder("notify")
                console.log("Someone is watching you");
                chrome.notifications.create(not, not_options);
            }
            else {
                sendOrder("show_screen")
                console.log("You are alone lol");
                chrome.notifications.clear(not);
            }
            return true;
        } else {
            console.log("Unknown Face in image");
            chrome.notifications.clear(not);
            sendOrder("blank_screen");
            return false;
        }
    }
}


// Fetch images of each class and return their descriptors and classname
async function initTrainDescriptorsByClass(net, values) {
    return Promise.all(classes.map(
        async className => {
            const descriptors = []
            for (let value of values) {
                const img = await faceapi.bufferToImage(value);
                descriptors.push(await net.computeFaceDescriptor(img));
            }
            return {
                descriptors,
                className
            }
        }
    ));
}

// Best match using eucledian distance
function getBestMatch(descriptorsByClass, queryDescriptor) {
    function computeMeanDistance(descriptorsOfClass) {
        return faceapi.round(
            descriptorsOfClass
                .map(d => faceapi.euclideanDistance(d, queryDescriptor))
                .reduce((d1, d2) => d1 + d2, 0) /
            (descriptorsOfClass.length || 1)
        )
    }
    return descriptorsByClass
        .map(
            ({ descriptors, className }) => ({
                distance: computeMeanDistance(descriptors),
                className
            })
        )
        .reduce((best, curr) => best.distance < curr.distance ? best : curr)
}

// May be useful for debugging
function draw_detections(canvas, detection, landmarks, bestMatch, EUCLID_MAX_DISTANCE) {
    faceapi.drawDetection('overlay', [detection], { withScore: false })
    faceapi.drawLandmarks('overlay', landmarks, { lineWidth: 4, color: 'red' })
    const text = `${bestMatch.distance < EUCLID_MAX_DISTANCE ? bestMatch.className : 'unkown'} (${bestMatch.distance})`
    const { x, y, height: boxHeight } = detection.getBox();
    faceapi.drawText(
        canvas.getContext('2d'),
        x,
        y + boxHeight,
        text,
        Object.assign(faceapi.getDefaultDrawOptions(), { color: 'red', fontSize: 16 })
    );
}

async function initGlobals() {
    let store = new IdbKvStore(DB_NAME);
    let values;
    try {
        values = await store.get(USERNAME);
    } catch (err) {
        console.error("Error while getting from db");
    }
    console.log("Loading Models for " + use_model);
    await load_models();
    console.log("Loaded Models");
    console.log("Initializing Train Descriptors!");
    trainDescriptorsByClass = await initTrainDescriptorsByClass(faceapi.recognitionNet, values);
    console.log("Initialized Train Descriptors Successfully!");
}

async function runDetection(imageCapture) {
    let image = await imageCapture.takePhoto();
    let imgObject = new Image();
    imgObject.src = URL.createObjectURL(image);
    await doesMatch(imgObject);
    setTimeout(runDetection, 1, imageCapture);
}

async function main() {
    console.log('Background main started');
    await initGlobals();
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(gotMedia)
        .catch(error => console.error('getUserMedia() error:', error));

    async function gotMedia(mediaStream) {
        // Use mediastream to do whatever you want
        const mediaStreamTrack = mediaStream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(mediaStreamTrack);
        console.log('Background infinite check started');
        runDetection(imageCapture);
    }
}